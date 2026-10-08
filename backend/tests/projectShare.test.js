import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { presentPublicProject, shareFilter, getSharedProject, downloadSharedProjectFile } from '../src/controllers/projectShareController.js';
import Project from '../src/models/Project.js';
import ProjectShare from '../src/models/ProjectShare.js';

test('public project includes requested sections and excludes client and document storage metadata', () => {
  const project = presentPublicProject({ name: 'Demo', projectType: ['Recording'], requiredLanguage: ['Hindi'], applicationQuestions: ['Language?'], notes: 'Public notes', progress: 20, clientName: 'Secret client', clientRate: 999, employees: [{ email: 'private' }], files: [{ name: 'Brief.pdf', key: 'private-key', uploadedBy: 'user-id', url: 'private-url' }] });
  assert.equal(project.notes, 'Public notes');
  assert.equal(project.progress, 20);
  assert.deepEqual(project.applicationQuestions, ['Language?']);
  assert.deepEqual(project.projectType, ['Recording']);
  assert.deepEqual(project.requiredLanguage, ['Hindi']);
  assert.deepEqual(project.files, [{ name: 'Brief.pdf', index: 0 }]);
  for (const field of ['clientName', 'clientRate', 'employees']) assert.equal(Object.hasOwn(project, field), false);
});
test('short tokens have 16 URL-safe characters and old links remain valid', () => {
  const token = randomBytes(12).toString('base64url');
  assert.equal(token.length, 16);
  assert.deepEqual(shareFilter(token), { shortToken: token });
  assert.deepEqual(shareFilter('a'.repeat(64)), { token: 'a'.repeat(64) });
  for (const value of ['invalid', '', '../files', 'x'.repeat(64)]) assert.equal(shareFilter(value), null);
});
test('public reads use the token-selected project and safe response', async (t) => {
  t.mock.method(ProjectShare, 'findOne', (filter) => {
    assert.deepEqual(filter, { shortToken: 'a'.repeat(16) });
    return { lean: async () => ({ project: 'shared-project' }) };
  });
  t.mock.method(Project, 'findById', (id) => {
    assert.equal(id, 'shared-project');
    return { select(fields) { assert.equal(fields.includes('clientName'), false); return { lean: async () => ({ name: 'Demo', clientName: 'secret', clientRate: 5, files: [] }) }; } };
  });
  let payload;
  await getSharedProject({ params: { token: 'a'.repeat(16) } }, { set() {}, json(data) { payload = data; } }, (error) => { throw error; });
  assert.deepEqual(payload, { name: 'Demo', files: [] });
});
test('invalid share token and document index return 404 without database access', async () => {
  for (const [handler, params] of [[getSharedProject, { token: 'invalid' }], [downloadSharedProjectFile, { token: 'a'.repeat(16), fileIndex: '-1' }], [downloadSharedProjectFile, { token: 'invalid', fileIndex: '0' }]]) {
    let status;
    await handler({ params }, { set() {}, status(value) { status = value; return this; }, json() {} }, (error) => { throw error; });
    assert.equal(status, 404);
  }
});
test('document download is limited to files on the token-selected project', async (t) => {
  t.mock.method(ProjectShare, 'findOne', () => ({ lean: async () => ({ project: 'shared-project' }) }));
  t.mock.method(Project, 'findById', (id) => {
    assert.equal(id, 'shared-project');
    return { select: () => ({ lean: async () => ({ files: [{ name: 'Brief', url: 'https://example.com/brief.pdf' }] }) }) };
  });
  let location;
  let status;
  const response = { set() {}, redirect(url) { location = url; }, status(code) { status = code; return this; }, json() {} };
  await downloadSharedProjectFile({ params: { token: 'a'.repeat(16), fileIndex: '0' } }, response, (error) => { throw error; });
  assert.equal(location, 'https://example.com/brief.pdf');
  await downloadSharedProjectFile({ params: { token: 'a'.repeat(16), fileIndex: '1' } }, response, (error) => { throw error; });
  assert.equal(status, 404);
});
