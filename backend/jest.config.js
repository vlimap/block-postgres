module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  resetMocks: true,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
};
