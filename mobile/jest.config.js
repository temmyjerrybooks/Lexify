module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./src/__tests__/setup.js'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-redux|@reduxjs|expo-secure-store|expo-haptics|expo-av|@react-native-async-storage)/)',
  ],
  moduleNameMapper: {
    'expo/virtual/env': '<rootDir>/src/__tests__/__mocks__/emptyMock.js',
    '\\.(png|jpg|jpeg|gif|svg|ttf|woff|woff2)$': '<rootDir>/src/__tests__/__mocks__/emptyMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.{js,jsx}'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/__tests__/setup.js',
    '!src/__tests__/__mocks__/**',
  ],
};
