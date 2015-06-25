/**
 * Tricker game rules module. Follows the interface
 * that is expected of Rules objects when you use
 * by the multigames platform i.e. a Rule object shall
 * have these methods:
 *  
 *      init(game)
 *      eventHandler(event, game, socket)
 *      getType()
 *
 * The Tricker game rules object is a Singleton, that shall
 * be used by all Tricker games on a server. It is also stateless.
 */

// External modules
var Player = require('multigame').Player;

// Internal modules
var GameObject = require('./GameObject');
var configs = require('./configurations');
var utils = require('./utils');
var gameInit = require('./gameInit');
var playerInit = require('./playerInit');

// Variables
var addGameObjects = utils.addGameObjects;
var getTargetRing = utils.getTargetRing;
var calcRoundPoints = utils.calcRoundPoints;
var hasWinner = utils.hasWinner;
var arePlayersReady = utils.arePlayersReady;


/**
 * Tricker constructor function
 */
function Tricker() {
    this.maxPlayers = configs.maxPlayers;
    this.minPlayers = configs.minPlayers;
    this.type = 'Tricker';    
};

/**
 * Initiation of a Tricker game
 *
 * @param game to be initiated
 */
Tricker.prototype.init = function(game) {

    gameInit(game);    
};

/**
 * Handling of Tricker game events.
 *
 * @param event that was triggered
 * @param game that is associated with the event
 * @param socket where the event was received
 *
 * (ALTERNATIVE: Add this to the sockets instead?!)
 */
Tricker.prototype.eventHandler = function(event, game, socket) {

    var gameState = game.getState();
    var type = event.type;

    console.log('eventHandler: ' + type);

    switch(type) {

        // Add a player to the game
        case 'add_player':
            if (game.getPlayers().length >= this.maxPlayers) {

                // No more players can connect, have reached the maximum number of players
                return;
            }

            // Create a new player
            var player = playerInit(new Player(socket), game);
            game.registerObserver(player);

            // Check if the game can be started
            if (game.getPlayers().length >= this.minPlayers && gameState.status === 'not_min_players') {
                
                // The game can be started
                game.setState({status: 'startable'});
            }
            else if (game.getPlayers().length < this.minPlayers && (
                gameState.status === 'startable' || gameState.status === 'started')) {
                
                // The game does not have enough players to be started
                game.setState({status: 'not_min_players'});
            }

            game.notify();
            break;
        
        // Add an observer to the game
        case 'add_observer':
            game.registerObserver(new Observer(socket));
            game.notify();
            break;

        // A game start event
        case 'start':

            // Reset the game
            game.reset();

            /**
             * Adds the players' index in the game.players-array to the respective player state
             * to be able to easily identify the player in the client.
             */
            game.getPlayers().forEach(function(p) { p.setState({index: game.getPlayers().indexOf(p)}) });

            // Add game objects to the game
            addGameObjects(game);
            
            game.setState({status: 'started'});
            game.notify();
            break;

        // A player is ready to start a round
        case 'player_ready':

            var player = game.getPlayer(socket);
            var players = game.getPlayers();
            
            // The player is ready to start the next round
            player.setState({status: 'ready'});

            // Are both players ready?
            if (arePlayersReady(players)) {

                // Both players are ready to start
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
            game.getPlayers().forEach(function(p, i) { p.roundReset(i); });

            // Decide which player that should be "knower"/"guesser"
            if (game.getState().round === 1) {
                players[0].setState({knower: true});
                players[1].setState({knower: false});
                knower = players[0];
                guesser = players[1];

                // Index of the 'knower' in the array of players, info for the client when displaying round results
                game.setState({knower: 0}); 

            } else {

                // Change which player is "knower"/"guesser"
                if (players[0].getState().knower) {
                    players[0].setState({knower: false});
                    players[1].setState({knower: true});
                    knower = players[1];
                    guesser = players[0];

                    // Index of the 'knower' in the array of players, info for the client when displaying round results
                    game.setState({knower: 1});
                } else {
                    players[0].setState({knower: true});
                    players[1].setState({knower: false});
                    knower = players[0];
                    guesser = players[1];

                    // Index of the 'knower' in the array of players, info for the client when displaying round results
                    game.setState({knower: 0});
                }
            }

            // Decide which ring should be the target
            var i = getTargetRing();
            game.target = i;

            // Only the 'knower' should get information on which ring is the target
            knower.setState({target: i}); 

            // Start the round timer
            game.timer(knower, guesser);

            game.setState({status: 'round_started'});
            game.notify();
            break;

        // A 'move to' event from a player client
        case 'move_to':
            var player = game.getPlayer(socket);
            player.moveTo(event.point);
            break;

        // A round is over
        case 'round_over':

            // Calculate round points and update total points
            calcRoundPoints(game);

            // Show, for all observers, which ring was the target
            game.setState({target: game.target});

            // Has someone won?
            if (hasWinner(game)) {
                game.triggerEvent({type: 'end'});
            } else {
                game.setState({status: 'round_end'});
                game.notify();
                
                // Increase round
                game.getState().round++; // FIXME: Better way to update the game state
            }
            break;

        // Someone has won
        case 'end':
            game.setState({status: 'game_end'});
            game.notify();
            break;

        // An observer/player has disconnected
        case 'disconnect':

            if (game.getPlayers().length < this.minPlayers) {

                // Clear all game objects
                gameState.objects.length = 0;
                game.rings.length = 0;
                game.setState({status: 'not_min_players'});
            }
            break;
    }
};

/**
 * Returns the type of rules object.
 *
 * @return type of rules object
 */
Tricker.prototype.getType = function() { return this.type; };

// Export a Tricker rules object
module.exports = new Tricker();