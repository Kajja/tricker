/**
 * A module that export a function that inits
 * a player object with the properties and methods
 * relevant for a Tricker game.
 */

var configs = require('./configurations');
var GameObject = require('./GameObject');

var field = configs.field;


/**
 * Function that inits a Tricker player object
 *
 * @param player to be initiated
 * @param game that the player belongs to
 *
 * @return the initiated player object 
 */
function playerInit(player, game) {

    // Create a game object representation of the player
    var gameObj = new GameObject({type: 'player', pos: [], dim: [10, 10]});

    // Set default values for the player's state
    player.setState({
        representation: gameObj,
        timeLeft: 0,
        knower: false,
        status: 'not_ready',
        winner: false,
        target: null,
        index: null
    });

    // Keep track of total points
    player.points = 0;

    // Keep track of round points
    player.roundPoints = 0;

    // Holds id of the move process (see player.moveTo method)
    player.moveIntervalId = null;

    // Method that resets a player after a round
    player.roundReset = function(i) {
        var representation = player.getState().representation;

        // Setting player start position
        representation.pos = [
            Math.ceil(field.width/3 + field.width/3 * i),
            Math.ceil(field.height/2 - 20)
        ];

        representation.inside = false;

        player.roundPoints = 0;

        player.setState({
            status: 'not_ready',
            target: null
        });
    };

    // Total player reset
    player.resetAll = function(i) {
        player.roundReset(i);
        player.points = 0;
        player.state.winner = false;
    };

    /**
     * Handling player movement, a process is started
     * that moves the player towards the point, with
     * speed depending on how far it is to the point from
     * the current position of the player.
     *
     * @param point where the player shall move to
     */
    player.moveTo = function(point) {

        var x = Math.floor(point[0]);
        var y = Math.floor(point[1]);
        var gameObj = this.getState().representation;
        var playerState = player.getState();

        /** If the user wants to change direction and the previous
         * move is not finished, clear the earlier move interval process.
         */
        if (player.moveIntervalId !== null) {
            clearInterval(player.moveIntervalId);
        }

        /**
         * Check if the player is inside any of the rings, if it is
         * its game object inside property is set to true else false.
         */
        function insideCheck() {
            var playerObj = player.getState().representation;

            playerObj.inside = false;

            game.rings.some(function(ring) { 
                if (ring.isInside(playerObj)) {
                    playerObj.inside = true;
                    return true;
                }
            });
        };

        /**
         * Calulates the step lenght for the next player move.
         * Works in one dimension.
         *
         * @param here where the player object currently is
         * @param to, the end point for the player
         *
         * @return the new position for the player for the next move
         */
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
        }, configs.moveUpdate);

    };

    return player;
};

module.exports = playerInit;