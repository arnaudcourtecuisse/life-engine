const CellStates = require("./Cell/CellStates");
const Neighbors = require("../Grid/Neighbors");
const Hyperparams = require("../Hyperparameters");
const Directions = require("./Directions");
const Anatomy = require("./Anatomy");
const Brain = require("./Perception/Brain");
const Actions = require("./Perception/Actions");
const FossilRecord = require("../Stats/FossilRecord");
const SerializeHelper = require("../Utils/SerializeHelper");
const Random = require("../Utils/Random");

class Organism {
    constructor(col, row, env, parent = null) {
        this.c = col;
        this.r = row;
        this.env = env;
        this.lifetime = 0;
        this.energy = 1;
        this.living = true;
        this.anatomy = new Anatomy(this);
        this.direction = Directions.down; // direction of movement
        this.rotation = Directions.up; // direction of rotation
        this.move_ticks = 0;
        this.move_decision_interval = 3;
        this.mutability = Hyperparams.globalMutability;
        this.damage = 0;

        if (parent != null) {
            this.inherit(parent);
        }
        // Init brain after inheriting all body cells of parent
        this.brain = new Brain(this, parent);
    }

    inherit(parent) {
        this.move_decision_interval = parent.move_decision_interval;
        this.mutability = parent.mutability;
        this.species = parent.species;
        for (const c of parent.anatomy.cells) {
            //deep copy parent cells
            this.anatomy.addInheritCell(c);
        }
        if (parent.anatomy.is_mover && parent.anatomy.has_eyes) {
            this.brain.copy(parent.brain);
        }
    }

    lifespan() {
        return this.anatomy.cells.length * Hyperparams.lifespanMultiplier;
    }

    maxHealth() {
        return this.anatomy.cells.length;
    }

    get reproduction_cost() {
        return 1 + this.anatomy.cells.length;
    }

    attemptReproduce() {
        if (this.energy < this.reproduction_cost) return;

        //produce mutated child
        const org = new Organism(0, 0, this.env, this);
        org.mutate(this.mutability);

        // compute child location
        const distance = this.anatomy.birth_distance + Random.randomInt(3);
        const [direction_c, direction_r] = Directions.getRandomScalar();
        const new_c = this.c + direction_c * distance;
        const new_r = this.r + direction_r * distance;
        const new_rotation = Hyperparams.rotationEnabled
            ? Directions.getRandomDirection()
            : this.direction;
        if (
            org.isClear(new_c, new_r, new_rotation, true) &&
            org.isStraightPath(new_c, new_r, this.c, this.r, this)
        ) {
            // set child in the env
            org.c = new_c;
            org.r = new_r;
            org.rotation = new_rotation;
            this.env.addOrganism(org);
            org.updateGrid();
            FossilRecord.registerOrganismSpecies(org, this.env.total_ticks);
            this.energy -= this.reproduction_cost;
        } else {
            this.abortReproduction(direction_c, direction_r);
        }
    }

    abortReproduction(direction_c, direction_r) {
        let c = this.c + direction_c;
        let r = this.r + direction_r;
        let cell = this.env.grid_map.cellAt(c, r);
        while (
            cell !== null &&
            (cell.owner === this || cell.state === CellStates.food)
        ) {
            c += direction_c;
            r += direction_r;
            cell = this.env.grid_map.cellAt(c, r);
        }
        if (cell !== null && cell.state === CellStates.empty) {
            // Drop dead egg
            this.env.changeCell(c, r, CellStates.food, null);
            this.energy -= 1;
        }
    }

    mutate() {
        if (Hyperparams.useEvolutiveMutability) {
            this.mutability = Random.randomInt(
                this.mutability + 2,
                Math.max(1, this.mutability - 1)
            );
        }
        if (Random.randomChance(this.mutability, 2)) {
            // Higher chance of behavioral change
            this.mutateBehavior();
        }

        return Random.randomChance(this.mutability) && this.mutateBody();
    }

    mutateBehavior() {
        this.brain.mutate();
    }

    mutateBody() {
        let mutated = false;
        if (Random.randomChance(Hyperparams.addProb)) {
            const branch = this.anatomy.getRandomCell();
            const state = CellStates.getRandomLivingType(); //branch.state;
            const growth_direction = Random.randomPick(Neighbors.all);
            const c = branch.loc_col + growth_direction[0];
            const r = branch.loc_row + growth_direction[1];
            if (this.anatomy.canAddCellAt(c, r)) {
                mutated = true;
                this.anatomy.addRandomizedCell(state, c, r);
            }
        }
        if (Random.randomChance(Hyperparams.changeProb)) {
            const cell = this.anatomy.getRandomCell();
            const state = CellStates.getRandomLivingType();
            this.anatomy.replaceCell(state, cell.loc_col, cell.loc_row);
            mutated = true;
        }
        if (Random.randomChance(Hyperparams.removeProb)) {
            if (this.anatomy.cells.length > 1) {
                const cell = this.anatomy.getRandomCell();
                mutated |= this.anatomy.removeCell(cell.loc_col, cell.loc_row);
            }
        }
        return mutated;
    }

    get move_cost() {
        return Hyperparams.cellWeight * this.anatomy.move_cost;
    }

    attemptMove(offset) {
        if (!this.anatomy.is_mover || this.energy < this.move_cost) {
            return false;
        }
        const [dc, dr] = offset;
        const new_c = this.c + dc;
        const new_r = this.r + dr;

        if (!this.isClear(new_c, new_r)) return false;

        for (const cell of this.anatomy.cells) {
            const real_c = this.c + cell.rotatedCol(this.rotation);
            const real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, CellStates.empty, null);
        }
        this.c = new_c;
        this.r = new_r;
        this.energy -= this.move_cost;
        this.updateGrid();
        return true;
    }

    get rotation_cost() {
        return Hyperparams.cellWeight * this.anatomy.rotation_cost;
    }

    attemptRotate() {
        if (!Hyperparams.rotationEnabled || this.energy < this.rotation_cost)
            return false;

        const new_rotation = Directions.getRandomDirection();
        if (!this.isClear(this.c, this.r, new_rotation)) return false;
        this.energy -= this.rotation_cost;

        for (const cell of this.anatomy.cells) {
            const real_c = this.c + cell.rotatedCol(this.rotation);
            const real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, CellStates.empty, null);
        }
        this.rotation = new_rotation;
        this.updateGrid();
        return true;
    }

    // assumes either c1==c2 or r1==r2, returns true if there is a clear path from point 1 to 2
    isStraightPath(c1, r1, c2, r2, parent) {
        if (c1 == c2) {
            [r1, r2] = [r1, r2].sort();
            for (let i = r1; i < r2; i++) {
                const cell = this.env.grid_map.cellAt(c1, i);
                if (!this.isPassableCell(cell, parent)) {
                    return false;
                }
            }
            return true;
        } else {
            [c1, c2] = [c1, c2].sort();
            for (let i = c1; i < c2; i++) {
                const cell = this.env.grid_map.cellAt(i, r1);
                if (!this.isPassableCell(cell, parent)) {
                    return false;
                }
            }
            return true;
        }
    }

    isPassableCell(cell, parent) {
        return (
            cell != null &&
            (cell.state == CellStates.empty ||
                cell.owner == this ||
                cell.owner == parent ||
                cell.state == CellStates.food)
        );
    }

    isClear(col, row, rotation = this.rotation) {
        for (const localCell of this.anatomy.cells) {
            const cell = this.getRealCell(localCell, col, row, rotation);
            if (cell == null) {
                return false;
            }
            if (
                cell.owner == this ||
                cell.state == CellStates.empty ||
                (!Hyperparams.foodBlocksReproduction &&
                    cell.state == CellStates.food)
            ) {
                continue;
            }
            return false;
        }
        return true;
    }

    harm() {
        this.damage++;
        if (this.damage >= this.maxHealth() || Hyperparams.instaKill) {
            this.die();
        }
    }

    die() {
        for (const cell of this.anatomy.cells) {
            const real_c = this.c + cell.rotatedCol(this.rotation);
            const real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, CellStates.food, null);
        }
        FossilRecord.registerDeath(this.species);
        this.living = false;
        return false;
    }

    updateGrid() {
        for (const cell of this.anatomy.cells) {
            const real_c = this.c + cell.rotatedCol(this.rotation);
            const real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, cell.state, cell);
        }
    }

    update() {
        ++this.lifetime;
        if (this.lifetime > this.lifespan()) {
            return this.die();
        }
        this.attemptReproduce();

        for (const cell of this.anatomy.cells) {
            cell.performFunction();
            if (!this.living) return this.living;
        }

        // Retrieve sensory data from surroundings
        let sensoryData = this.getSensoryData();
        // Get action output levels from brain
        let actionLevels = this.brain.update(sensoryData);
        // Execute actions over their respective threshold
        this.executeActions(actionLevels);

        return this.living;
    }

    // Count sensor neurons from organism's cell types
    // Used for configuring the brain's neural net
    getNumSensors() {
        let numSensors = 0;
        for (var cell of this.anatomy.cells) {
            numSensors += cell.getNumSensorNeurons();
        }
        return numSensors;
    }

    // Returns an array of scaled sensory values between 0.0 and 1.0 gathered from body cells
    getSensoryData() {
        var sensorValues = [];
        for (var cell of this.anatomy.cells) {
            if (cell.getNumSensorNeurons() > 0) {
                sensorValues = sensorValues.concat(cell.getSensorValues());
            }
        }
        return sensorValues;
    }

    executeActions(actionLevels) {
        // ------------- Movement action neurons ---------------
        // There are multiple action neurons for movement. Each type of movement neuron
        // urges the individual to move in some specific direction. We sum up all the
        // X and Y components of all the movement urges, then pass the X and Y sums through
        // a transfer function (tanh()) to get a range -1.0..1.0. The absolute values of the
        // X and Y values are passed through prob2bool() to convert to -1, 0, or 1, then
        // multiplied by the component's signum. This results in the x and y components of
        // a normalized movement offset. I.e., the probability of movement in either
        // dimension is the absolute value of tanh of the action level X,Y components and
        // the direction is the sign of the X, Y components. For example, for a particular
        // action neuron:
        //     X, Y == -5.9, +0.3 as raw action levels received here
        //     X, Y == -0.999, +0.29 after passing raw values through tanh()
        //     Xprob, Yprob == 99.9%, 29% probability of X and Y becoming 1 (or -1)
        //     X, Y == -1, 0 after applying the sign and probability
        //     The agent will then be moved West (an offset of -1, 0) if it's a legal move.

        // moveX,moveY will be the accumulators that will hold the sum of all the
        // urges to move along each axis. (+- floating values of arbitrary range)
        let moveX = actionLevels[Actions.moveX];
        let moveY = actionLevels[Actions.moveY];

        let level = actionLevels[Actions.moveRandom];

        let dir = Directions.getRandomScalar();
        moveX += dir[0] * level;
        moveY += dir[1] * level;

        // Convert the accumulated X, Y sums to the range -1.0..1.0
        moveX = Math.tanh(moveX);
        moveY = Math.tanh(moveY);

        // The probability of movement along each axis is the absolute value
        let probX = Random.coinFlip(Math.abs(moveX)); // convert abs(level) to 0 or 1
        let probY = Random.coinFlip(Math.abs(moveY)); // convert abs(level) to 0 or 1

        // The direction of movement (if any) along each axis is the sign
        let signumX = moveX < 0.0 ? -1 : 1;
        let signumY = moveY < 0.0 ? -1 : 1;

        // Generate a normalized movement offset, where each component is -1, 0, or 1
        let offset = [probX * signumX, probY * signumY];
        // Move there if it's a valid location
        this.attemptMove(offset);
    }

    getRealCell(local_cell, c = this.c, r = this.r, rotation = this.rotation) {
        const real_c = c + local_cell.rotatedCol(rotation);
        const real_r = r + local_cell.rotatedRow(rotation);
        return this.env.grid_map.cellAt(real_c, real_r);
    }

    serialize() {
        const org = SerializeHelper.copyNonObjects(this);
        org.anatomy = this.anatomy.serialize();
        if (this.anatomy.is_mover && this.anatomy.has_eyes)
            org.brain = this.brain.serialize();
        org.species_name = this.species.name;
        return org;
    }

    loadRaw(org) {
        SerializeHelper.overwriteNonObjects(org, this);
        this.anatomy.loadRaw(org.anatomy);
        if (org.brain) this.brain.copy(org.brain);
    }
}

module.exports = Organism;
