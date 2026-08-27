// Re-export persistent Cloud Storage for backward compatibility
import { cloudStorage } from './cloudStorage.js';

export { cloudStorage };
export const photoDB = cloudStorage;
export default cloudStorage;
