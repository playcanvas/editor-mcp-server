import { z } from 'zod';

export const RgbSchema = z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1)
]).describe('RGB color [r,g,b] 0-1');

export const RgbaSchema = z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1)
]).describe('RGBA color [r,g,b,a] 0-1');

export const Vec2Schema = z.tuple([
    z.number(),
    z.number()
]).describe('[x,y]');

export const Vec3Schema = z.tuple([
    z.number(),
    z.number(),
    z.number()
]).describe('[x,y,z]');

export const Vec4Schema = z.tuple([
    z.number(),
    z.number(),
    z.number(),
    z.number()
]).describe('[x,y,z,w]');

export const AssetIdSchema = z.number().int().nullable().describe('Asset ID');
export const EntityIdSchema = z.string().uuid().describe('Entity ID');
