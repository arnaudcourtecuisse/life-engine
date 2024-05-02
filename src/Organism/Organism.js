const CellStates = require("./Cell/CellStates");
const Neighbors = require("../Grid/Neighbors");
const Hyperparams = require("../Hyperparameters");
const Directions = require("./Directions");
const Anatomy = require("./Anatomy");
const Brain = require("./Perception/Brain");
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
        this.move_range = 3;
        this.mutability = Hyperparams.globalMutability;
        this.damage = 0;
        this.brain = new Brain(this);
        if (parent != null) {
            this.inherit(parent);
        }
    }

    inherit(parent) {
        this.move_range = parent.move_range;
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
        const possibleMutations = [];

        if (this.anatomy.has_eyes) {
            possibleMutations.push(() => {
                this.brain.mutate();
            });
        }
        if (this.anatomy.is_mover) {
            possibleMutations.push(() => {
                if (this.move_range === 1) ++this.move_range;
                else this.move_range += Random.coinFlip() ? -1 : 1;
            });
        }
        if (possibleMutations.length > 0) {
            Random.randomPick(possibleMutations)();
        }
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

    attemptMove() {
        if (this.energy < this.move_cost) return false;

        const [dc, dr] = Directions.scalars[this.direction];
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
        for (const loccell of this.anatomy.cells) {
            const cell = this.getRealCell(loccell, col, row, rotation);
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

        if (!this.anatomy.is_mover) return this.living;

        let moved = false;
        if (this.move_ticks > this.move_range) {
            this.move_ticks = 0;
            const next_direction =
                this.brain.pickDirection() ?? Directions.getRandomDirection();
            this.direction = next_direction;
            moved = this.attemptRotate(next_direction);
        }
        if (!moved) {
            moved = this.attemptMove();
        }
        ++this.move_ticks;
        return this.living;
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
