module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf', 'security', 'ci', 'build'],
    ],
    // Allow long body lines — existing commits use multi-line bodies >100 chars
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
