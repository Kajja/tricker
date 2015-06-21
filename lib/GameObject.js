//***** GameObject constructor function *****//

var GameObject = function(spec) {
    this.type = spec.type;
    this.pos = spec.pos || [];
    this.dim = spec.dim || [];

    this.radius = spec.radius || 0;

    //Star (put in its own prototype?)
    this.star = false;

    //Mark if some object is inside
    this.inside = false;
};

GameObject.prototype.isInside = function(gameObj) {

    if (this.pos !== []) {
    // Check if the middle of the gameObject is inside this gameObj
    // Circle:
    // Check if distance from a point to a circle center is less or equal to the radius
        var distance = Math.sqrt(Math.pow(gameObj.pos[0] - this.pos[0], 2) + Math.pow(gameObj.pos[1] - this.pos[1], 2));
        //console.log('distande: ' + distance);
        return distance <= this.radius;
    }
};

module.exports = GameObject;