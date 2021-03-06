/**
 * Tricker game client, to be loaded in a browser.
 *
 * It is implemented as a stateless object, so when a notification is received from
 * the server, everything is created from scratch.
 *
 * It requires that the mulitgame client is loaded first, which exposes a GameProxy object
 * that this client use.
 */

var TrickerClient = (function () {

    var config = { 
            canvasW: 500, 
            canvasH: 500,
            star: '../images/star2.png' 
    };
    var canvas;

    // Canvas context
    var ctx = {};

    // Latest server game state
    var state = {};

    // Reference to the star image
    var img;

    // Gui object that can add buttons etc.
    var gui;

    // Flag indicating if the client is a player or not
    var isPlayer;

    /**
     * Initiates the client.
     *
     * @param {Object} canvasEl - the canvas element
     * @param {String} url - the server url to connect to
     * @param {String} clientType - the type of client (viewer/player)
     * @param {Object} guiObj - a gui object that control, for example, buttons for starting a game
     */
    function init(canvasEl, url, gameId, clientType, guiObj) {

        canvas = canvasEl;

        // Setting the dimension of the canvas
        canvas.width = config.canvasW;
        canvas.height = config.canvasH;

        // Getting canvas context 2d api
        ctx = canvas.getContext('2d');

        // Setting up canvas click and touch handler
        $(canvas).on('click touch', canvasHandler);

        // Connecting to server
        GameProxy.connect(url, gameId, clientType);

        // Star image indicating the target ring
        img = new Image();
        img.src = config.star;

        /**
         * Associating a gui with the Tricker client that handles
         * buttons to start a game for example. A gui object
         * receives events from the TrickerClient object.
         */
        gui = guiObj;

        isPlayer = clientType === 'player';
    };

    // "Start" event handler
    function start() {
        GameProxy.eventHandler({
            type: 'start'
        });
    };

    // "Ready" event handler
    function ready() {
        GameProxy.eventHandler({
            type: 'player_ready'
        });
    };

    /**
     * Method that is called by the GameProxy when
     * it has received a new message from the server.
     *
     * @param {Object} gameState - server game state
     */
    function update(gameState) {

        state = gameState;

        /**
         * Handling different types of states:
         *      1) not_min_players = not enough players to start a game
         *      2) max_players_reached = no more players can connect to the game
         *      3) startable = the game can be started
         *      4) started = the game has started
         *      5) waiting_round_start = one of the players is ready, waiting for the oppenent to be ready
         *      6) round_started = a round is ongoing
         *      7) round_end = a round is finished
         *      8) game_end = a game has ended
         */

        switch (state.status) {

            // The minimum number of players has not been reached
            case 'not_min_players':
                clearCanvas();
                if (isPlayer) {
                    drawInfo('Waiting for another player to connect');
                } else {
                    drawInfo('Waiting for players to connect');
                }
                break;

            // Maximum number of players has been reached
            case 'max_players_reached':     
                break;

            // The game can be started
            case 'startable':               
                clearCanvas();
                drawInfo('The game can be started');
                draw(state);
                break;

            // The game has been started by one of the players
            case 'started':                 
                draw(state);
                break;

            // At least one player is ready, waiting for all players to be ready
            case 'waiting_round_start':     
                clearCanvas();
                draw(state);
                if (isPlayer) {
                    if (state.player.status === 'ready') {
                        drawInfo('Waiting for your opponent to be ready');
                    } else {
                        drawInfo('Your opponent is ready');
                    }
                } else {
                    drawInfo('Waiting for players to be ready');
                }
                break;

            // A game round has been started
            case 'round_started':           
                draw(state);
                break;

            // A game round is over
            case 'round_end':               
                draw(state);
                break;

            // The game is finished
            case 'game_end':                
                draw(state);
                break;
        }

        // If there is any gui object it is informed of the game state
        if (gui) gui.update(state.status);
    };

    /**
     * Draws the game objects in the current game state.
     *
     * @param {Object} state - current game state
     */
    function draw(state) {

        // Check if there are any game objects to draw
        if (state.objects.length > 0 ) {

            var objects = state.objects;
            var background = objects.filter(function(o) { return o.type === 'background'; });
            var ringObj = objects.filter(function(o) { return o.type === 'ring'; });
            var playerObj = objects.filter(function(o) { return o.type === 'player'; });

            clearCanvas();
            
            // The objects must be drawn in a specific order

            // Draws the background
            background.forEach(function(o) { drawBackground(o); });

            // Draws the rings
            ringObj.forEach(function(o, i) { drawRing(o); });

            // Draws target, if the player is the "knower"
            if (isPlayer && state.status === 'round_started' && state.player.knower) { 
                drawTarget(ringObj[state.player.target]);
            }

            // If a round or the game is over, everybody should know which ring was the target
            if (state.status === 'round_end' || state.status === 'game_end') {
                drawTarget(ringObj[state.target]);
            }

            // Draws players
            drawPlayer(playerObj[0]);
            drawPlayer(playerObj[1], 'red');

            // Draws text (score, round and time left)
            drawText(state);

            // Draws round results
            if (state.status === 'round_end') {
                drawRoundResults(state);
            }

            // Splash Win/Lost
            if (state.status === 'game_end') {
                drawSplash(state);            
            }
        }
    };

    /**
     * Draws white text on a black transparent rectangular
     * background, approx in the middle of the canvas.
     *
     * @param {String} info - the text to be displayed
     */
    function drawInfo(info) {

        var width = config.canvasW;
        var height = config.canvasH;

        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillRect(width/2 - 150, height/2 - 75, 300, 100)
        ctx.fillStyle = 'white';
        ctx.font = '15px arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(info, width/2, height/2 - 30, 250);
        ctx.restore();
    };

    /**
     * Draws a player as a circle. Default color is green.
     *
     * @param {Object} player - object that represent the player to be drawn
     * @param {String} color - the color of the circle representing the player
     */
    function drawPlayer(player, color) {

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = color || 'green';
        ctx.arc(player.pos[0], player.pos[1], 20, 0, Math.PI * 2, false);
        ctx.fill();

        if (player.inside) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 5;
            ctx.stroke();
        }
        ctx.restore();
    };

    /**
     * Draws the background (mat, Tricker text, ...)
     *
     * @param {Object} spec - specification
     */
    function drawBackground(spec) {

        var width = config.canvasW;
        var height = config.canvasH;

        console.log('Ritar bakgrund');
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'lightgrey';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 20;
        ctx.arc(width/2, height/2, width/2.5, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.fillStyle = 'lightblue';
        ctx.fill();
        ctx.fillStyle = '#5CB8E6';
        ctx.textAlign = 'center';
        ctx.font = 'italic bold 50px Arial';
        ctx.fillText('TRICKER', width/2, height/2);
        ctx.restore();
    };

    /**
     * Draws a "target" ring.
     *
     * @param {Object} ring - object representing the ring object to be drawn
     */
    function drawRing(ring) {
 
        ctx.save();
        ctx.beginPath();   
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 8;
        ctx.translate(ring.pos[0], ring.pos[1]);
        ctx.arc(0, 0, 50, 0, Math.PI * 2, false);
        ctx.stroke();
        ctx.restore();
    };

    /**
     * Draws the target image (a star).
     *
     * @param {Object} targetRing - the ring object which is the target
     */
    function drawTarget(targetRing) {

        var x = targetRing.pos[0] - img.width/2;
        var y = targetRing.pos[1] - img.height/2 - 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
    };

    /**
     * Draws the score, round number and time left.
     *
     * @param {Object} state - game state
     */
    function drawText(state) {

        var width = config.canvasW;
        var greenText = 'Green';
        var redText = 'Red';

        if (isPlayer) {
            greenText += state.player.index === 0 ? '(You)' : '';
            redText += state.player.index === 1 ? '(You)' : '';
        } else {
            greenText += state.knower === 0 ? '(Knower)' : '';
            redText += state.knower === 1 ? '(Knower)' : '';
        }

        ctx.save();
        ctx.beginPath();
 
        // Score
        ctx.font = '15px arial';
        ctx.textAlign = 'right';
        ctx.fillText(greenText + ': ' + state.score[0], 120, 50);
        ctx.fillText(redText + ': ' + state.score[1], 120, 65);
        
        // Round number
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = '28px arial';
        ctx.lineWidth = '3';
        ctx.fillStyle = 'white';
        ctx.strokeText('Round ' + state.round, width/2, 30);
        ctx.fillText('Round ' + state.round, width/2, 30);
        
        // Time left
        ctx.strokeStyle = 'red';
        ctx.font = 'italic 60px arial';
        ctx.fillStyle = 'yellow';
        ctx.textAlign = 'right';
        ctx.lineWidth = '5';
        if (isPlayer) {
            ctx.strokeText(state.player.timeLeft, 450, 70);
            ctx.fillText(state.player.timeLeft, 450, 70);
        } else {
            ctx.strokeText(state.timeLeft, 450, 70);
            ctx.fillText(state.timeLeft, 450, 70);
        }

        // Time left round
        ctx.fillStyle = 'black';
        ctx.font = '15px arial';
        ctx.textAlign = 'left';
        ctx.lineWidth = '1';
        ctx.fillText('/ ' + state.timeLeft, 460, 70);

        ctx.restore();
    };

    /**
     * Displays the results of a round.
     *
     * @param {Object} state - game state
     */
    function drawRoundResults(state) {

        var width = config.canvasW;
        var height = config.canvasH;
        var greenKnower = ':  ';
        var redKnower = ':  ';

        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillRect(width/2 - 100, height/2 - 75, 200, 100)
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 1;
        ctx.font = '20px arial';
        ctx.textAlign = 'center';
        ctx.fillText('Round points', width/2, height/2 - 50);
        ctx.font = '17px arial';
        if (state.knower === 0) {
            greenKnower = ' (Knower):  ';
        } else {
            redKnower = ' (Knower):  ';
        }
        ctx.textAlign = 'right';
        ctx.fillText('Green' + greenKnower + state.roundPoints[0], width/2 + 60, height/2 - 20);
        ctx.fillText('Red' + redKnower + state.roundPoints[1], width/2 + 60, height/2);
        ctx.restore();
    };

    /**
     * Draws a winner or looser text at the end of a game.
     *
     * @param {Object} state - game state
     */
    function drawSplash(state) {

        var width = config.canvasW;
        var height = config.canvasH;

        ctx.save();
        ctx.font = '40px arial italic';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'red';
        ctx.lineWidth = 3;

        // Displays different texts if the player won or lost
        if (isPlayer) {
            if (state.player.winner) {
                ctx.lineWidth = 5;
                ctx.font = '80px arial italic';
                ctx.strokeText('You won!', width/2, height/2);
                ctx.fillText('You won!', width/2, height/2);
            } else {
                ctx.strokeText('Sorry, you lost ...', width/2, height/2);
                ctx.fillText('Sorry, you lost ...', width/2, height/2);
            }
        } else {
            ctx.strokeText('We have a winner!', width/2, height/2);
            ctx.fillText('We have a winner!', width/2, height/2);
        }
        ctx.restore();
    };

    /**
     * Clears the canvas.
     */
    function clearCanvas() {
        ctx.clearRect(0, 0, config.canvasW, config.canvasH);
    };

    /**
     * Handling click and touch events from the canvas.
     *
     * @param {Object} event - click/touch event
     */
    function canvasHandler(event) {

        if (isPlayer) {
            // Get the position of the click/touch in canvas coordinates
            // (From: http://stackoverflow.com/questions/29501447/why-does-css-centering-mess-up-canvas-mouse-coordinates/29501632#29501632)
            var rect = canvas.getBoundingClientRect(); // 
            var x = event.clientX - rect.left;
            var y = event.clientY - rect.top;

            moveTo(x, y);
        }
    };

    /**
     * Generate a 'move to' event that is sent to the server
     * if the player has any time left.
     *
     * @param {Number} x - x value of the posistion that was clicked/touched
     * @param {Number} y - y value of the posistion that was clicked/touched
     */
    function moveTo(x, y) {
        if (state.player.timeLeft > 0) {
            GameProxy.eventHandler({ type: 'move_to', point: [x, y]});
        }
    };

    return {
        init: init,
        start: start,
        ready: ready,
        update: update,
    };
})();

// Register the tricker client as an observer to GameProxy events
GameProxy.registerObserver(TrickerClient);