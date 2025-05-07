const Neighbors = require("./Grid/Neighbors");

const defaults = {
    // Environment
    foodDropProb: 0,
    foodBlocksReproduction: true,

    // Organism
    lifespanMultiplier: 1000,
    rotationEnabled: true,

    // Mutation
    useEvolutiveMutability: true,
    globalMutability: 5,
    addProb: 33,
    changeProb: 33,
    removeProb: 33,

    // Cell: mouth
    edibleNeighbors: Neighbors.adjacent,

    // Cell: mover
    cellWeight: 0.002,
    moversCanProduce: false,

    // Cell: producer
    foodProdProb: 0.005,
    growableNeighbors: Neighbors.adjacent,

    // Cell: killer
    killableNeighbors: Neighbors.adjacent,
    instaKill: false,

    // Cell: eye
    lookRange: 20,
    seeThroughSelf: false,
};

const HyperParams = {
    ...defaults,

    setDefaults: function () {
        Object.assign(this, defaults);
    },

    loadJsonObj(obj) {
        Object.assign(this, obj);
    },
};

module.exports = HyperParams;
