// Configurations

var configs = {};

// Playing field
configs.field = {width: 500, height: 500};
configs.numOfRings = 3;

// The time a guesser has in a round (seconds)
configs.roundTime = 15;

// The less seconds a knower has than a guesser in a round (seconds)
configs.knowerLess = 5; 

// Game rule settings
configs.winPoints = 2;
configs.loosePoints = -2;
configs.maxPlayers = 2;
configs.minPlayers = 2;

// How often a player's position is updated when it moves (milliseconds)
configs.moveUpdate = 100;

module.exports = configs;