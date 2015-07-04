/**
 * GameObject module: exports a constructor function
 * that is used to generate game objects which all objects
 * in a game are a type of. They can have a position, can
 * interact etc.
 *
 * @param {Object} spec - specifications
 */

var GameObject = function(spec) {
    this.type = spec.type;
    this.pos = spec.pos || [];
    this.dim = spec.dim || [];

    this.radius = spec.radius || 0;

    //Indicates if this is a star GameObject
    this.star = false;

    //Is set if this game object is inside another game object
    this.inside = false;
};

/**
 * Method to check if this GameObject is inside another
 * GameObject.
 *
 * @param {Object} gameObj - GameObject to test if this GameObject is inside
 * @return {Boolean} true if inside else false
 */
GameObject.prototype.isInside = function(gameObj) {

    if (this.pos !== []) {

        /**
         * Circle:
         * Check if the distance from a point to a circle center is less or equal to the radius
         */
        var distance = Math.sqrt(Math.pow(gameObj.pos[0] - this.pos[0], 2) + Math.pow(gameObj.pos[1] - this.pos[1], 2));
        return distance <= this.radius;
    }
};

module.exports = GameObject;