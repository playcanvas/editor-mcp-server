import { z } from 'zod';

export const RgbSchema = z.tuple([
    z.number().min(0).max(1).describe('Red'),
    z.number().min(0).max(1).describe('Green'),
    z.number().min(0).max(1).describe('Blue')
]).describe('A 3-channel RGB color');

export const RgbaSchema = z.tuple([
    z.number().min(0).max(1).describe('Red'),
    z.number().min(0).max(1).describe('Green'),
    z.number().min(0).max(1).describe('Blue'),
    z.number().min(0).max(1).describe('Alpha')
]).describe('A 4-channel RGBA color');

export const Vec2Schema = z.tuple([
    z.number().describe('X'),
    z.number().describe('Y')
]).describe('A 2D vector');

export const Vec3Schema = z.tuple([
    z.number().describe('X'),
    z.number().describe('Y'),
    z.number().describe('Z')
]).describe('A 3D vector');

export const Vec4Schema = z.tuple([
    z.number().describe('X'),
    z.number().describe('Y'),
    z.number().describe('Z'),
    z.number().describe('W')
]).describe('A 4D vector');

export const AssetIdSchema = z.number().int().nullable().describe('An asset ID.');
export const EntityIdSchema = z.string().uuid().describe('An entity ID.');
