cd dist
cp ../package.json .
npm install --production
zip -r ../weather-lambda.zip .
cd ..