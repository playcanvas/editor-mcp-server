import { z } from 'zod';

const RgbSchema = z.tuple([
    z.number().min(0).max(1).describe('Red'),
    z.number().min(0).max(1).describe('Green'),
    z.number().min(0).max(1).describe('Blue')
]).describe('A 3-channel RGB color');
const RgbaSchema = z.tuple([
    z.number().min(0).max(1).describe('Red'),
    z.number().min(0).max(1).describe('Green'),
    z.number().min(0).max(1).describe('Blue'),
    z.number().min(0).max(1).describe('Alpha')
]).describe('A 4-channel RGBA color');
const Vec2Schema = z.tuple([
    z.number().describe('X'),
    z.number().describe('Y')
]).describe('A 2D vector');
const Vec3Schema = z.tuple([
    z.number().describe('X'),
    z.number().describe('Y'),
    z.number().describe('Z')
]).describe('A 3D vector');
const Vec4Schema = z.tuple([
    z.number().describe('X'),
    z.number().describe('Y'),
    z.number().describe('Z'),
    z.number().describe('W')
]).describe('A 4D vector');

export { RgbSchema, RgbaSchema, Vec2Schema, Vec3Schema, Vec4Schema };
