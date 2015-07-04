/**
 * A module with utility functions for Tricker
 */

 // Internal module dependencies
var configs = require('./configurations');
var GameObject = require('./GameObject');

// Variables
var field = configs.field;
var numOfRings = configs.numOfRings;
var winPoints = configs.winPoints;
var loosePoints = configs.loosePoints;

var utils = {};

/**
 * Add all the game objects to a Tricker game instance.
 *
 * @param {Object} game - the game to which the objects shall be added
 */
utils.addGameObjects = function(game) {
    
    var gameObjects = [];
    var ring1, ring2, ring3;
            
    // Background
    gameObjects.push(new GameObject({type: 'background'}));

    // Rings
    ring1 = new GameObject({type: 'ring', pos: [field.width/2, field.height/4 - 20], radius: 50});
    ring2 = new GameObject({type: 'ring', pos: [field.width/4, field.height*3/4 - 50], radius: 50});
    ring3 = new GameObject({type: 'ring', pos: [field.width*3/4, field.height*3/4 - 50], radius: 50});
    
    gameObjects.push(ring1);
    gameObjects.push(ring2);
    gameObjects.push(ring3);

    // Adds the rings to the rings-array for easy access to them
    game.rings.push(ring1);     
    game.rings.push(ring2);
    game.rings.push(ring3);

    // Adds the players' game representation
    game.getPlayers().forEach(function(p, i) { 
        var gameObj = p.getState().representation;

        // Adding representation to the game objects array
        gameObjects.push(gameObj);
    });

    // Adds the game objects to the game state
    game.setState({objects: gameObjects});
};

/**
 * Method that randomly chooses one of the rings as
 * the target ring.
 *
 * @return {Number} index - the index of the target ring
 */
utils.getTargetRing = function() {
    return Math.floor(Math.random() * numOfRings);
};

/**
 * Calculate points after a round has been completed.
 *
 * @param {Object} game - the game where a round has ended
 */
utils.calcRoundPoints = function(game) {

    var target = game.rings[game.target];
    var knower = game.getPlayers().filter(function(p) { return p.getState().knower; })[0];
    var guesser = game.getPlayers().filter(function(p) { return !p.getState().knower; })[0];

    /**
     * Check if a player is inside any of the rings
     *
     * @param {Object} player - player to check
     * @return {Boolean} true if the player is inside any of the rings else false
     */
    function isInsideRings (player) {
        return game.rings.some(function(r) { return r.isInside(player.getState().representation); });
    };

    /**
     * Returns the ring that the player is inside
     *
     * @param {Object} player - player to check
     * @return {Object} ring object or null
     */
     function insideRing (player) {
        var inside = game.rings.filter(function(r) { return r.isInside(player.getState().representation); });
        return inside.length > 0 ? inside[0] : null;
     };

    // Calculate round points and update total points

    // Is the knower inside the target?
    if (target.isInside(knower.getState().representation)) {
        
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
        
            // Is the guesser inside the target?
            if (target.isInside(guesser.getState().representation)) {
        
                // points: knower -1, guesser 1
                knower.points--;
                guesser.points++;
                knower.roundPoints = -1;
                guesser.roundPoints = 1;
            } else {
        
                // Is the guesser inside another ring?
                if (isInsideRings(guesser)) {

                    // Is it the same as the knower?
                    if (insideRing(knower) === insideRing(guesser)) {

                        // points: knower 0, guesser -1
                        guesser.points--;
                        knower.roundPoints = 0;
                        guesser.roundPoints = -1;                        
                    } else {

                        // points: knower -1, guesser -1
                        knower.points--;
                        guesser.points--;
                        knower.roundPoints = -1;
                        guesser.roundPoints = -1;
                    } 

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

    // Update total and round points information in the game object
    utils.updateScoreInfo(game);
};

/**
 * Updates total and round points information in the game object
 *
 * @param {Object} game - the game where the information shall be updated
 */
utils.updateScoreInfo = function(game) {

    players = game.getPlayers();
    game.setState({
        score: [players[0].points, players[1].points],
        roundPoints: players.map(function(p) { return p.roundPoints; })
    });
};

/**
 * Checks if the game has a winner
 *
 * @param {Object} game - the game where a winner might exist
 */
utils.hasWinner = function(game) {

    players = game.getPlayers();

    if (players[0].points >= winPoints || players[1].points <= loosePoints) {
        players[0].setState({winner: true});
        return true;
    }

    if (players[1].points >= winPoints || players[0].points <= loosePoints) { // TODO: Is not "write once"
        players[1].setState({winner: true});
        return true;
    }
    return false;
};

/**
 * Checks if both player are ready to start a round
 *
 * @param {Array} players - the players in a game
 *
 * @return {Boolean} true or false depending on if all players are ready
 */
utils.arePlayersReady = function(players) {
    var readyPlayers = players.filter(function(p){ return p.getState().status === 'ready';}).length;
    var numOfPlayers = players.length; 

    return  readyPlayers === numOfPlayers;
};

module.exports = utils;