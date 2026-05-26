import { z } from 'zod';

export const RgbSchema = z.array(z.number().min(0).max(1)).length(3).describe('RGB color [r,g,b] 0-1');

export const RgbaSchema = z.array(z.number().min(0).max(1)).length(4).describe('RGBA color [r,g,b,a] 0-1');

export const Vec2Schema = z.array(z.number()).length(2).describe('[x,y]');

export const Vec3Schema = z.array(z.number()).length(3).describe('[x,y,z]');

export const Vec4Schema = z.array(z.number()).length(4).describe('[x,y,z,w]');
export const AssetIdSchema = z.number().int().nullable().describe('Asset ID');
export const EntityIdSchema = z.string().uuid().describe('Entity ID');
