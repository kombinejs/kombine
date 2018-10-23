# kombine

## What is kombine?
**kombine** is a tool for developer to separately write each part of a web page then combining them into one single js file (kinda like single page application).

## Basic tutorial
1. Create a project
```
npm init
npm install https://github.com/kombinejs/kombine.git --save
```

2. Create some files
 ```
 project root
 ├── pages
 │   ├── home
 |   │   ├── main.html
 |   │   ├── main.js
 |   │   ├── part1.html
 |   │   ├── part1.js
 |   │   ├── index.html
 ├── build.js
 ```
 ```
 //main.html
 
 <view>
  <h1>Hello World</h1>
  <view src="./part1.html"></view>
 </view>
 <style>
  h1{
    color: #555;
  }
 </style>
 ```
  ```
 //part1.html
 
 <view>
  <p id="part1" class="part1">part 1</p>
 </view>
 <style>
  .part1{
    color: #999;
  }
 </style>
 
 
 //part1.js
 
 document.getElementById('part1').innerHTML += '<br> text from script!!!';
 ```
   ```
 //build.js
 
const kombine = require('kombine');
kombine(`${__dirname}/pages/home`);
 ```
3. Run build.js
 ```
 node ./build.js
 ```
 you should see **main.bundle.js** is generated.
 
4. Create an index.html to show the result
```
<!DOCTYPE html>
<html>
<head>    
</head>
<body>
    <script src="./main.bundle.js"></script>
</body>
</html>
```
