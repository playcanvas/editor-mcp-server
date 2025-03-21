import { z } from 'zod';

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]).describe('An array of 3 numbers');
const Vec4Schema = z.tuple([z.number(), z.number(), z.number(), z.number()]).describe('An array of 4 numbers');

export { Vec3Schema, Vec4Schema };
