/**
 * A module that export a function that inits
 * a player object with the properties and methods
 * relevant for a Tricker game.
 */

// Internal modules
var configs = require('./configurations');
var GameObject = require('./GameObject');

// Variables
var field = configs.field;

/**
 * Function that inits a Tricker player object.
 *
 * @param {Object} player - the player object to be initiated
 * @param {Object} game - the game that the player belongs to
 *
 * @return {Object} player - the initiated player object 
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

    /**
     * Method that resets a player after a round.
     *
     * @param {Number} i - index of the player in the game
     */
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

    /**
     * A total player reset.
     *
     * @param {Number} i - index of the player in the game
     */
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
     * @param {Array} point - the point (x,y) where the player shall move to
     */
    player.moveTo = function(point) {

        var x = Math.floor(point[0]);
        var y = Math.floor(point[1]);
        var gameObj = this.getState().representation;
        var playerState = player.getState();

        /** 
         * If the user wants to change direction and the previous
         * move is not finished, clear the earlier move process.
         */
        if (player.moveIntervalId !== null) {
            clearInterval(player.moveIntervalId);
        }

        /**
         * Check if the player is inside any of the rings. If it is,
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
         * Calulates the step lenght for the next player move
         * and returns the new location of the player after the
         * next move. Step length depends on the distance from
         * 'here' to 'to'.
         *
         * @param {Number} here - where the player currently is
         * @param {Number} to - where the player is going
         *
         * @return {Number} here - the new 'here' for the player for the next move
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

        /** 
         * Starts a process that moves the player a step every X ms.
         * The process stops when the player has reached the point
         * where it shall move to or if the player has run out of time.
         */
        player.moveIntervalId = setInterval(function() {

            // Check if the player has reached the target point
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