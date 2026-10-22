/* Loader for the Design Component pages: they are classic scripts, so this module hands them the game. */
import * as THREE from '../../vendor/three/three.module.js';
import { createCroquet, GAME } from './croquet.js';
import { createWorldTest } from './world-test.js';

const ns = (window.EightGates = window.EightGates || {});
ns.croquet = { createCroquet, GAME, createWorldTest, THREE };
window.dispatchEvent(new CustomEvent('8g-ready:croquet'));
