import assert from 'assert';
import { access } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const files = [
    'app/api/generate-project/route.ts',
    'app/api/update-project/route.ts'
  ];

  for (const file of files) {
    try {
      await access(path.join(__dirname, '..', file));
    } catch {
      assert.fail(`${file} not found`);
    }
  }

  console.log('API route files exist');
})();
