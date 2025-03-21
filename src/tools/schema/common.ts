import { z } from 'zod';

const Vec2Schema = z.tuple([z.number(), z.number()]).describe('An array of 2 numbers');
const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]).describe('An array of 3 numbers');
const Vec4Schema = z.tuple([z.number(), z.number(), z.number(), z.number()]).describe('An array of 4 numbers');

export { Vec2Schema, Vec3Schema, Vec4Schema };
