{ pkgs }:
pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs-18_x  # Use Node.js v18.x (or update to your version)
  ];
}
