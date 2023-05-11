const Neighbors = require("./Grid/Neighbors");

const Hyperparams = {
    setDefaults: function () {
        this.lifespanMultiplier = 100;
        this.foodProdProb = 5;
        this.killableNeighbors = Neighbors.adjacent;
        this.edibleNeighbors = Neighbors.adjacent;
        this.growableNeighbors = Neighbors.adjacent;

        this.useEvolutiveMutability = true;
        this.globalMutability = 5;
        this.addProb = 33;
        this.changeProb = 33;
        this.removeProb = 33;

        this.rotationEnabled = true;

        this.foodBlocksReproduction = true;
        this.moversCanProduce = false;

        this.instaKill = false;

        this.lookRange = 20;
        this.seeThroughSelf = false;

        this.foodDropProb = 0;

        this.cellWeight = 0.001;
    },

    loadJsonObj(obj) {
        for (const key in obj) {
            this[key] = obj[key];
        }
    },
};

Hyperparams.setDefaults();

module.exports = Hyperparams;
