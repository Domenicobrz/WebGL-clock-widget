# WebGL-clock-widget
## A light weight 3D clock widget made with raw webGL

<img src="https://github.com/Domenicobrz/WebGL-clock-widget/blob/master/screenshots/clockwidget.png" width="300px">

Usage is as simple as creating a ClockWidget from an existing DOMContainer and updating it in your preferred 
animation handler

```javascript

// widget creation
var clockDOM = document.querySelector('#clockWidgetContainer');
window.clock = new ClockWidget(clockDOM);

// widget update 
clock.draw(now);   

```

The default mode has no alpha transparency and a default white background, both can be changed by adding the following options