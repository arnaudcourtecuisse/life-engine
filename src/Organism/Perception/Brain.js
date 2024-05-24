const Hyperparams = require("../../Hyperparameters");
const Directions = require("../Directions");
const CellStates = require("../Cell/CellStates");

const Decision = {
    neutral: 0,
    retreat: 1,
    chase: 2,
    getRandom: function () {
        return Math.floor(Math.random() * 3);
    },
    getRandomNonNeutral: function () {
        return Math.floor(Math.random() * 2) + 1;
    },
};

class Brain {
    constructor(owner) {
        this.owner = owner;
        this.observations = [];

        // corresponds to CellTypes
        this.decisions = {};
        for (const cell of CellStates.all) {
            this.decisions[cell.name] = Decision.neutral;
        }
        this.decisions[CellStates.food.name] = Decision.chase;
        this.decisions[CellStates.killer.name] = Decision.retreat;
    }

    copy(brain) {
        for (const dec in brain.decisions) {
            this.decisions[dec] = brain.decisions[dec];
        }
    }

    randomizeDecisions(randomize_all = false) {
        // randomize the non obvious decisions
        if (randomize_all) {
            this.decisions[CellStates.food.name] = Decision.getRandom();
            this.decisions[CellStates.killer.name] = Decision.getRandom();
        }
        this.decisions[CellStates.mouth.name] = Decision.getRandom();
        this.decisions[CellStates.producer.name] = Decision.getRandom();
        this.decisions[CellStates.mover.name] = Decision.getRandom();
        this.decisions[CellStates.armor.name] = Decision.getRandom();
        this.decisions[CellStates.eye.name] = Decision.getRandom();
    }

    observe(observation) {
        this.observations.push(observation);
    }

    pickDirection() {
        let decision = Decision.neutral;
        let bestInterest = 0;
        let move_direction = null;
        for (const tick in this.observations) {
            const obs = this.observations[tick];
            if (obs.cell == null || obs.cell.owner == this.owner) {
                continue;
            }
            let interest = tick + (Hyperparams.lookRange - obs.distance);
            const signalType = this.decisions[obs.cell.state.name];
            if (signalType !== Decision.neutral) {
                interest *= 2;
            }
            if (interest > bestInterest) {
                decision = signalType;
                move_direction = obs.direction;
                bestInterest = interest;
            }
        }
        this.observations = [];
        if (decision == Decision.chase) {
            return move_direction;
        } else if (decision == Decision.retreat) {
            return Directions.getOppositeDirection(move_direction);
        }
        return null;
    }

    mutate() {
        this.decisions[CellStates.getRandomName()] = Decision.getRandom();
        this.decisions[CellStates.empty.name] = Decision.neutral; // if the empty cell has a decision it gets weird
    }

    serialize() {
        return { decisions: this.decisions };
    }
}

Brain.Decision = Decision;

module.exports = Brain;
