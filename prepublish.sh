gulp --gulpfile ./createSyntax/gulpfile.js createSyntax
gulp --gulpfile ./createSyntax/gulpfile.js createMinDoc
tsc -p ./
gulp --gulpfile ./createSyntax/gulpfile.js fixRequire