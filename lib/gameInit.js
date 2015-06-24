/**
 * Game init module, export a function that inits a game
 * object with the properties and methods relevant for a
 * Tricker game
 */

var configs = require('./configurations');

/**
 * Function that inits a Tricker game
 *
 * @param game that is to be initiated
 */
function gameInit(game) {

    // Adding properites ...

    // Adds tricker game specifics to a Game-objects state
    game.setState({ 
        status: 'not_min_players',
        round: 1,
        objects: [],
        score: [0, 0],
        knower: null
    });

    // For simple and speedy access to ring objects
    game.rings = [];

    // For easy access to the target ring
    game.target;        

    // Adding methods ...

    // Timer method that counts down the seconds in a round
    game.timer = function(knower, guesser) {

        var time = configs.roundTime;
        var knowerLess = configs.knowerLess;

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

    // Metod that resets a game
    game.reset = function() {

        // Resets game properties
        game.setState({
            round: 1,
            score: [0, 0]
        });

        // Resets player properties
        game.getPlayers().forEach(function(p, i) {
            p.resetAll(i);
        });
    };
};

module.exports = gameInit;