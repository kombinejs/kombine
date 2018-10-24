# kombine

 
## What is kombine?
**kombine** is a tool for developer to separately write each part of a web page then combining them into one single js file (kinda like single page application).

 
## Basic tutorial
### 1. Create a project
```
npm init
npm install kombine --save
```

### 2. Create some files
 ```
 project root
 ├── pages
 │   ├── home
 |   │   ├── main.html          #required, it's the entry point
 |   │   ├── main.js            #required
 |   │   ├── part1.html
 |   │   ├── part1.js
 |   │   ├── index.html
 ├── build.js
 ```
 ```html
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
 ```html
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
 ```js
 //build.js
 
const kombine = require('kombine');
kombine(`${__dirname}/pages/home`);
 ```
### 3. Run build.js
 ```
 node ./build.js
 ```
 you should see **main.bundle.js** is generated.
 
### 4. Create an index.html to show the result
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

 
## How to use
**kombine** will deal with two type of files, html and js, where one is represent the view and the other is the script. You must name the script file exactly the same as the html if you want it to automatically add to the output file. For example, if you have a file name header.html, you should have a header.js in the same directory if you need a script to manipulate the view.

### .html
Here is an example of a html file. 
```html
<view>
  <view src="./header.html"></view>        <!-- include header.html -->
  <div class="content">
    ...
  </div>
  <view src="./footer.html"></view>        <!-- include footer.html -->
</view>

<style>                                    <!-- style of this view -->
  .content{
   ...
  }
</style>

<style src="./myStyle.css"></style>        <!-- you can also include other css file or you may want to separate the html and css -->
```

view is not reusable in the same page, which means you cannot include the same html file either in the main view or the children view. If you do so, there will be an error alert when you kombine them. 

If you want to reuse some layout, you can use template instead of view, here is an example
```html
//main.html
<view>
  ...
</view>

<template src="./myTemplate.html"><template>

<style>
  ...
</style>
 
 
//myTemplate.html
<template>
  <p>hello, I am template.</p>
</template>
 
<style>
  ...
</style>

```
then you can use script to add the template to the DOM.


### .js
```js
const myModule = require('any-module');             // you can require module as node.js, this will handle by browserify
```
