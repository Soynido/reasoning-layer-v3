const path = require('path');

module.exports = {
  target: 'node',
  mode: 'none',
  entry: './extension/extension.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode',
    chokidar: 'commonjs chokidar',
    'simple-git': 'commonjs simple-git',
    uuid: 'commonjs uuid'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader'
      }
    ]
  },
  devtool: 'nosources-source-map',
  node: {
    __dirname: false,
    __filename: false
  }
};
