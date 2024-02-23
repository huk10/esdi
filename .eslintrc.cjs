module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  root: true,
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
    // 下面规则经常出错，先禁用
    'no-unused-vars': 'off',
    // 类方法重载会被认为报错，先禁用
    'no-dupe-class-members': 'off',
    // 函数重载会被认为报错，先禁用
    'no-redeclare': 'off'
  },
};
