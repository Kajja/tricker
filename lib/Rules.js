//***** Tricker game rules and protocol *****//
// Singleton, stateless
//
// Game rule interface:
//   - init()
//   - eventHandler()

var GameObject = require('./GameObject');
var Player = require('../../multigame').Player;


// Configurations
var field = {width: 500, height: 500};
var guesserTime = 15;
var knowerTime = 10;
var numOfRings = 3;
var winPoints = 2;
var loosePoints = -3;

function Tricker() {
    this.maxPlayers = 2;
    this.minPlayers = 2;
    this.type = 'Tricker';    
};

// This method is called when a game is created
Tricker.prototype.init = function(game) {

    // Adds tricker game specifics to a Game-objects state
    game.setState({ 
        status: 'not_min_players',
        round: 1,
        objects: [],
        score: [0, 0],
        knower: null
    });

    game.rings = []; // To speed up travering
    game.target; // Easy access to the target, not to be sent to every observer

    // Methods
    game.timer = function(knower, guesser) {

        var time = 15; // Seconds           TODO: Reset players timeleft when a new round
        var knowerLess = 5;

        var proccessId = setInterval(function() {
            
            if (time <= 0) {
                clearInterval(proccessId);
                game.triggerEvent({type: 'round_over'});
            } else {
                time--;
                time - knowerLess > 0 ? knower.setState({timeLeft: time - 5}) : knower.setState({timeLeft: 0});
                guesser.setState({timeLeft: time});
                game.notify();
            }
        }, 1000);
    };

    game.reset = function() {

        game.setState({
            round: 1,
            score: [0, 0]
        });

        game.getPlayers().forEach(function(p) {
            p.resetAll();
        });
    };
};

// Handle Tricker game specific events
// ALTERNATIVT: Sätta detta på socket istället?!
Tricker.prototype.eventHandler = function(event, game, socket) {

    var gameState = game.getState();
    var type = event.type;

    console.log('eventHandler: ' + type);

    switch(type) {

        // Add a player to the game
        case 'add_player':
            if (game.getPlayers().length >= this.maxPlayers) {
                return;
            }
            // Creates a new player
            var player = playerInit(new Player(socket), game);
            game.registerObserver(player);

            // Check if the game could be started
            if (game.getPlayers().length >= this.minPlayers && gameState.status === 'not_min_players') {
                gameState.status = 'startable'; // TODO: Använd setState, I do this everywhere
            }
            // Check if the ...
            else if (game.getPlayers().length < this.minPlayers && (
                gameState.status === 'startable' || gameState.status === 'started')) {
                gameState.status = 'not_min_players';
            }
            // Inform the Game-object that things have changed
            game.notify();
            break;
        
        // Add an observer to the game
        case 'add_observer':
            game.registerObserver(new Observer(socket));
            game.notify();
            break;

        // A game start event
        case 'start':

            // Nollställa game
            game.reset();

            // To be able to identify the player in the client
            game.getPlayers().forEach(function(p) { p.setState({index: game.getPlayers().indexOf(p)}) });  // Inte snyggt!

            gameState.status = 'started'; // Använda setState istället

            gameState.objects.push(new GameObject({type: 'background'}));
            var ring1 = new GameObject({type: 'ring', pos: [field.width/2, field.height/4 - 20], radius: 50});
            var ring2 = new GameObject({type: 'ring', pos: [field.width/4, field.height*3/4 - 50], radius: 50});
            var ring3 = new GameObject({type: 'ring', pos: [field.width*3/4, field.height*3/4 - 50], radius: 50});
            gameState.objects.push(ring1);
            game.rings.push(ring1);
            gameState.objects.push(ring2);
            game.rings.push(ring2);
            gameState.objects.push(ring3);
            game.rings.push(ring3);
            
            // Add player graphical representation
            game.getPlayers().forEach(function(p, i) { 
                var gameObj = p.getState().representation;

                // Setting player start position
                gameObj.pos[0] = Math.ceil(field.width/3 + field.width/3 * i);
                gameObj.pos[1] = Math.ceil(field.height/2 - 20);

                // Adding representation to the game objects array
                gameState.objects.push(gameObj);
            });

            game.notify();
            break;

        // A player is ready to start a round
        case 'player_ready':
            var player = game.getPlayer(socket);
            var players = game.getPlayers();
            var knower;
            var guesser;
            
            // The player is ready to start the next round
            player.setState({status: 'ready'});

//            game.setState({status: 'round'});

            console.log('Player is ready');

            // Are both players ready?
            if (arePlayersReady(players)) {
                // Both players are ready to start
                console.log('Both players are ready');
                game.triggerEvent({type: 'new_round'});
            } else {
                game.setState({status: 'waiting_round_start'});
                game.notify();
            }                
            break;

        // Start a new round
        case 'new_round':
            var players = game.getPlayers();
            var knower;
            var guesser;

            // Resetting players
            players.forEach(function(p, i) { 
                var gameObj = p.getState().representation;

                gameObj.pos[0] = Math.ceil(field.width/3 + field.width/3 * i);
                gameObj.pos[1] = Math.ceil(field.height/2);

                gameObj.inside = false;
            });

            // Deciding which player that should be "knower"/"guesser"
            if (game.getState().round === 1) {
                players[0].setState({knower: true});
                players[1].setState({knower: false});
                knower = players[0];
                guesser = players[1];
                game.setState({knower: 0}); // For the client to know when writing round results

            } else {
                // Change which player is "knower"/"guesser"
                if (players[0].getState().knower) {
                    players[0].setState({knower: false}); // Måste hitta bättre sätt att uppdatera state!!!
                    players[1].setState({knower: true});
                    knower = players[1];
                    guesser = players[0];
                    game.setState({knower: 1});
                } else {
                    players[0].setState({knower: true}); // Måste hitta bättre sätt att uppdatera state!!!
                    players[1].setState({knower: false});
                    knower = players[0];
                    guesser = players[1];
                    game.setState({knower: 0});
                }
            }

            // Decide which ring should be the target
            var i = Math.floor(Math.random() * numOfRings);
            //game.target = game.rings[i];
            game.target = i;
            knower.setState({target: i}); // Only the 'knower' should get information on which ring is the target

            // Start the timer
            game.timer(knower, guesser);

            game.setState({status: 'round_started'});

            game.notify();
            break;

        case 'move_to':
            var player = game.getPlayer(socket);
            player.moveTo(event.point);
            break;

        case 'round_over':
            target = game.rings[game.target];
            knower = game.getPlayers().filter(function(p) { return p.getState().knower; })[0];
            guesser = game.getPlayers().filter(function(p) { return !p.getState().knower; })[0];

            function isInsideRings (player) {
                return game.rings.some(function(r) { return r.isInside(player.getState().representation); });
            };

            // Calculate points and see if there is a winner

            // Is the knower inside the target?
            if (target.isInside(knower.getState().representation)) {
            console.log('Knower i målet');
                // Is the guesser inside the target?
                if (target.isInside(guesser.getState().representation)) {
                    // points: knower 0, guesser 1
                    guesser.points++;
                    knower.roundPoints = 0;
                    guesser.roundPoints = 1;
                } else {

                    // Is the guesser inside another ring?
                    if (isInsideRings(guesser)) {
                        // points: knower 1, guesser -1
                        knower.points++;
                        guesser.points--;
                        knower.roundPoints = 1;
                        guesser.roundPoints = -1;
                    } else {
                        // Guesser is on the mat
                        // points: knower 1, guesser 0
                        knower.points++;
                        knower.roundPoints = 1;
                        guesser.roundPoints = 0;
                    }
                }
            } else {

                // Is the knower inside another ring?
                if (isInsideRings(knower)) {
                console.log('Knower i annan ring');
                    // Is the guesser inside the target?
                    if (target.isInside(guesser.getState().representation)) {
                        // points: knower -1, guesser 1
                        knower.points--;
                        guesser.points++;
                        knower.roundPoints = -1;
                        guesser.roundPoints = 1;
                    } else {

                        // Is the guesser inside another ring (same)?
                        if (isInsideRings(guesser)) {
                            // points: knower 0, guesser -1
                            guesser.points--;
                            knower.roundPoints = 0;
                            guesser.roundPoints = -1;
                        } else {
                            // Guesser is on the mat
                            // points: knower -1, guesser 0
                            knower.points--;
                            knower.roundPoints = -1;
                            guesser.roundPoints = 0;
                        }
                    }
                } else {
                    // The knower is on the mat
                    console.log('Knower på mattan');
                    // Is the guesser inside the target?
                    if (target.isInside(guesser.getState().representation)) {
                        // points: knower 0, guesser 1
                        guesser.points++;
                        knower.roundPoints = 0;
                        guesser.roundPoints = 1;
                    } else {
                        // Is the guesser inside another ring (same or different)?
                        if (isInsideRings(guesser)) {
                            // points: knower 0, guesser -1
                            guesser.points--;
                            knower.roundPoints = 0;
                            guesser.roundPoints = -1;
                        } else {
                            // Guesser is on the mat
                            // points: knower 0, guesser 0
                            knower.roundPoints = 0;
                            guesser.roundPoints = 0;
                        }
                    }
                }
            }
            console.log('knower points: ' + knower.points);
            console.log('guesser points: ' + guesser.points);

            // Show, for all observers, which ring was the target
            game.setState({target: game.target});

            this.updateScore(game);

            game.setState({roundPoints: game.getPlayers().map(function(p) { return p.roundPoints; })});

            // Has someone won?
            if (this.hasWinner(game)) {
                game.triggerEvent({type: 'end'});
                knower.setState({status: 'not_ready'}); // I reset istället?
                guesser.setState({status: 'not_ready'});
            } else {
                game.setState({status: 'round_end'});
                knower.setState({status: 'not_ready'}); // I reset istället?
                guesser.setState({status: 'not_ready'});
                game.notify();
                
                console.log('Innan ny omgång');
                // Increase round
                game.getState().round++; // Inte snyggt!
            }
            break;

        // Someone has won
        case 'end':
            console.log('Ngn har vunnit');
            game.setState({status: 'game_end'});
            game.notify();

            // Reset game?

            break;

        // An observer/player has disconnected
        case 'disconnect':

            if (game.getPlayers().length < this.minPlayers) {
                // Ska ju inte göras om en viewer kopplar ner bara om en player

                console.log('Inte tillräckligt många spelare');

                // Clear all game objects
                gameState.objects.length = 0; //TODO: Rensa i Player också?!
                game.rings.length = 0;
                game.setState({status: 'not_min_players'});
            }
            break;
    }
};

Tricker.prototype.getType = function() { return this.type; };

Tricker.prototype.hasWinner = function(game) {

    players = game.getPlayers();

    if (players[0].points >= winPoints || players[1].points <= loosePoints) {
        players[0].setState({winner: true});
        return true;
    }

    if (players[1].points >= winPoints || players[0].points <= loosePoints) { // TODO: Duplicering
        players[1].setState({winner: true});
        return true;
    }
    return false;
};

// Set 
Tricker.prototype.updateScore = function(game) {

    players = game.getPlayers();

    game.setState({score: [players[0].points, players[1].points]});
};

function arePlayersReady(players) {
    var readyPlayers = players.filter(function(p){ return p.getState().status === 'ready';}).length;
    var numOfPlayers = players.length; 

    console.log('Ready players:' + readyPlayers);
    console.log('Num of players:' + numOfPlayers);

    return  readyPlayers === numOfPlayers;
};


// Player init function
// adds properties and methods to a Player object
function playerInit(player, game) {

    // Creates a graphical representation of the player
    var gameObj = new GameObject({type: 'player', pos: [], dim: [10, 10]}); // Player representation

    player.setState({
        representation: gameObj,
        timeLeft: 0,
        knower: false,
        status: 'not_ready',
        winner: false
    });

    // Keep track of points
    player.points = 0;

    player.roundPoints = 0;

    player.moveIntervalId = null;

    player.moveTo = function(point) {

        var x = Math.floor(point[0]);
        var y = Math.floor(point[1]);
        var gameObj = this.getState().representation;
        var playerState = player.getState();

        // If the user wants to change direction and the previous
        // move is not finished.
        if (player.moveIntervalId !== null) {
            clearInterval(player.moveIntervalId);
        }

        function insideCheck() {
            var playerObj = player.getState().representation;

            playerObj.inside = false; // Resets player

            game.rings.some(function(ring) { // Stops when a ring is found that the player is in
                if (ring.isInside(playerObj)) {
                    playerObj.inside = true;
                    return true;
                }
            });
        };

        function moveHelper(here, to) {
            var step;
            var diff = to - here;
            var abs = Math.abs(diff);
            if (abs > 0) {
                step = abs <= 5 ? 1 : Math.ceil(abs/5);
                if (diff > 0) {
                    here += step;                        
                } else {
                    here -= step;
                }
            }
            return here;
        };

        // Moves a step every X ms
        player.moveIntervalId = setInterval(function() {

            if (x !== gameObj.pos[0] || y !== gameObj.pos[1]) {
                if (playerState.timeLeft > 0) {
                    gameObj.pos = [
                        moveHelper(gameObj.pos[0], x),
                        moveHelper(gameObj.pos[1], y)
                        ];
                    insideCheck();
                    game.notify();
                } else {
                    // Stop any movement if the player is out of time
                    clearInterval(player.moveIntervalId);
                    player.moveIntervalId = null;                    
                }
            } else {
                clearInterval(player.moveIntervalId);
                player.moveIntervalId = null;
            }
        }, 100);

    };

    player.resetPos = function() {
        player.getState().representation.pos = player.startPos; // Inte snyggt
        player.setState({status: 'not_ready'});
    };

    player.resetAll = function() {
        player.points = 0;
        player.state.winner = false;
    };

    return player;
};

module.exports = new Tricker(); // Singleton