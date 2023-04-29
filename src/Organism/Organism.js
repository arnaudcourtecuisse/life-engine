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
        this.food_collected = 0;
        this.living = true;
        this.anatomy = new Anatomy(this);
        this.direction = Directions.down; // direction of movement
        this.rotation = Directions.up; // direction of rotation
        this.move_count = 0;
        this.move_range = 4;
        this.ignore_brain_for = 0;
        this.mutability = 5;
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

    // amount of food required before it can reproduce
    foodNeeded() {
        return this.anatomy.is_mover
            ? this.anatomy.cells.length + Hyperparams.extraMoverFoodCost
            : this.anatomy.cells.length;
    }

    lifespan() {
        return this.anatomy.cells.length * Hyperparams.lifespanMultiplier;
    }

    maxHealth() {
        return this.anatomy.cells.length;
    }

    reproduce() {
        //produce mutated child
        const org = new Organism(0, 0, this.env, this);
        const has_mutated = org.mutate(this.mutability);

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
            if (has_mutated) {
                FossilRecord.addSpecies(org, this.species);
            } else {
                org.species.addPop();
            }
        }
        this.food_collected -= Math.min(this.food_collected, this.foodNeeded());
    }

    mutate() {
        this.mutability = Hyperparams.useGlobalMutability
            ? Hyperparams.globalMutability
            : Random.randomInt(
                  this.mutability + 2,
                  Math.max(1, this.mutability - 1)
              );
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
                this.move_range += Math.max(
                    -this.move_range,
                    Random.randomInt(3, -2)
                );
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

    attemptMove() {
        const direction = Directions.scalars[this.direction];
        const direction_c = direction[0];
        const direction_r = direction[1];
        const new_c = this.c + direction_c;
        const new_r = this.r + direction_r;
        if (this.isClear(new_c, new_r)) {
            for (const cell of this.anatomy.cells) {
                const real_c = this.c + cell.rotatedCol(this.rotation);
                const real_r = this.r + cell.rotatedRow(this.rotation);
                this.env.changeCell(real_c, real_r, CellStates.empty, null);
            }
            this.c = new_c;
            this.r = new_r;
            this.updateGrid();
            return true;
        }
        return false;
    }

    attemptRotate() {
        if (!Hyperparams.rotationEnabled) {
            this.direction = Directions.getRandomDirection();
            this.move_count = 0;
            return true;
        }
        const new_rotation = Directions.getRandomDirection();
        if (this.isClear(this.c, this.r, new_rotation)) {
            for (const cell of this.anatomy.cells) {
                const real_c = this.c + cell.rotatedCol(this.rotation);
                const real_r = this.r + cell.rotatedRow(this.rotation);
                this.env.changeCell(real_c, real_r, CellStates.empty, null);
            }
            this.rotation = new_rotation;
            this.direction = Directions.getRandomDirection();
            this.updateGrid();
            this.move_count = 0;
            return true;
        }
        return false;
    }

    changeDirection(dir) {
        this.direction = dir;
        this.move_count = 0;
    }

    // assumes either c1==c2 or r1==r2, returns true if there is a clear path from point 1 to 2
    isStraightPath(c1, r1, c2, r2, parent) {
        if (c1 == c2) {
            if (r1 > r2) {
                const temp = r2;
                r2 = r1;
                r1 = temp;
            }
            for (let i = r1; i != r2; i++) {
                const cell = this.env.grid_map.cellAt(c1, i);
                if (!this.isPassableCell(cell, parent)) {
                    return false;
                }
            }
            return true;
        } else {
            if (c1 > c2) {
                const temp = c2;
                c2 = c1;
                c1 = temp;
            }
            for (let i = c1; i != c2; i++) {
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
        this.species.decreasePop();
        this.living = false;
    }

    updateGrid() {
        for (const cell of this.anatomy.cells) {
            const real_c = this.c + cell.rotatedCol(this.rotation);
            const real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, cell.state, cell);
        }
    }

    update() {
        this.lifetime++;
        if (this.lifetime > this.lifespan()) {
            this.die();
            return this.living;
        }
        if (this.food_collected >= this.foodNeeded()) {
            this.reproduce();
        }
        for (const cell of this.anatomy.cells) {
            cell.performFunction();
            if (!this.living) return this.living;
        }

        if (this.anatomy.is_mover) {
            this.move_count++;
            let changed_dir = false;
            if (this.ignore_brain_for == 0) {
                changed_dir = this.brain.decide();
            } else {
                this.ignore_brain_for--;
            }
            const moved = this.attemptMove();
            if ((this.move_count > this.move_range && !changed_dir) || !moved) {
                const rotated = this.attemptRotate();
                if (!rotated) {
                    this.changeDirection(Directions.getRandomDirection());
                    if (changed_dir)
                        this.ignore_brain_for = this.move_range + 1;
                }
            }
        }

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
