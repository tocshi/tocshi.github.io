# [Back to main page](./index.md)

---

<br>
### Dataset Analysis Using Scikit Learn - 2020

Throughout my Machine Learning course I worked with Python's [Scikit Learn](https://scikit-learn.org/stable/) and [Pandas](https://pandas.pydata.org/) libraries in Jupyter Lab to analyze datasets and train machine learning models to make predictions about new data. Shown below, is a screenshot of my analysis on a dataset about [Airbnb](https://www.airbnb.com/) rental listings, where I use [SHAP](https://shap.readthedocs.io/en/latest/) to determine which attributes of an Airbnb listing contribute the most to its popularity, which is measured by how many reviews it gets per month.

<img src="tocshi.github.io/Library/330proj_1.png" width="97%" height="97%">

<br>
### Data Manager Mini-Application - 2020

A project for my Databases course where I worked with a small team to make a Java application that uses SQL to view and manage the values of pre-made data tables. A simple GUI is implemented to make our application user-friendly and human-readable. This application was developed with the context of a "Fantasy Role-Playing Game" in mind, and is intended to be used for such. Below are some screenshots of our application in action, changing and viewing data values respectively.

<img src="tocshi.github.io/Library/304proj_1.png" width="97%" height="97%">
<img src="tocshi.github.io/Library/304proj_2.png" width="97%" height="97%">

<br>
### Image Classifier Using Bag-of-Words - 2019

A project for my Computer Vision course where I used Python to train a database to form a vocabulary of "visual words," a series of image features that correspond to certain objects that help in identifying said objects. I then used two of Python Scikit Learn's classifier algorithms, a [k-nearest-neighbors](https://en.wikipedia.org/wiki/K-nearest_neighbors_algorithm) classifier and a [support vector machine](https://en.wikipedia.org/wiki/Support-vector_machine) classifier, to attempt to identify the contents of sample images. Unfortunately, the only easily presentable results of this process that I was able to produce are in the form of [confusion matrices](https://en.wikipedia.org/wiki/Confusion_matrix), which are shown below.

<img src="tocshi.github.io/Library/figure_16.png" width="48%" height="48%"> <img src="tocshi.github.io/Library/figure_17.png" width="48%" height="48%">
<br>
### Automatically Generated Texture Synthesis - 2019

A project for my Computer Vision course where I used Python to demonstrate the [Efros and Leung method](https://people.eecs.berkeley.edu/~efros/research/EfrosLeung.html) of texture synthesis. Simply put, it fills in a portion of an image with a sample texture from a different part of the image, using a comparison of the sum of squared differences between the to the fill area and the sample texture to determine how the texture is generated. This allows the resultant texture fill to look as natural as possible. I tested this process on multiple images, two of which are shown below.

<img src="tocshi.github.io/Library/moon.JPG" width="48%" height="48%"> <img src="tocshi.github.io/Library/MoonkaS.JPG" width="48%" height="48%">
<img src="tocshi.github.io/Library/Momiji.PNG" width="48%" height="48%"> <img src="tocshi.github.io/Library/MomiS.JPG" width="48%" height="48%">
<br>
### Template-Matching Face Detection - 2019

A project for my Computer Vision course where I used Python to attempt to detect faces in an image by matching a generic face template to various scalings of said image. I used a [Gaussian Pyramid](https://www.cs.utah.edu/~arul/report/node12.html) in order to preserve details while downsizing the image, and then used a pre-built [normalized cross-correlation](https://www.mathworks.com/help/images/ref/normxcorr2.html) function to find areas that resembled the template. Below is a sample image on which I ran my face detector, showing that although it was able to find all the faces in the image, it is still far from perfect as it tends to find faces where there are none.

<img src="tocshi.github.io/Library/2.PNG" width="97%" height="97%">
<br>
### C++ Colour Picker and Fill - 2018

A project for my Data Structures course where I worked with a partner to create simplified versions of the [Stack](https://www.geeksforgeeks.org/stack-data-structure/) and [Queue](https://www.geeksforgeeks.org/queue-data-structure/) data structures using C++. With our makeshift stack and queue, we then created a [flood fill algorithm](https://en.wikipedia.org/wiki/Flood_fill) that would fill an image area with a pattern determined by a separate algorithm we made. Using different data structures to store the data for each pixel would yield the same resultant image, but different intermediate steps of reaching the final result, as shown below.

<img src="tocshi.github.io/Library/dfscustom.gif" width="48%" height="48%"> <img src="tocshi.github.io/Library/bfscustom.gif" width="48%" height="48%">
Left: Filling using the stack data structure. Right: Filling using the queue data structure
<br>


---

[knn]: tocshi.github.io/Library/figure_16.png "k Nearest Neighbors Confusion Matrix"
[svm]: tocshi.github.io/Library/figure_17.png "Support-Vector Machine Confusion Matrix"
[moon0]: tocshi.github.io/Library/moon.JPG "Night Sky with Moon"
[moon1]: tocshi.github.io/Library/MoonkaS.JPG "Night Sky without Moon"
[momiji0]: tocshi.github.io/Library/Momiji.PNG "Momiji with a Crow"
[momiji1]: tocshi.github.io/Library/MomiS.JPG "Momiji without a Crow"
[family]: tocshi.github.io/Library/2.PNG "Template-Matching Face Decection"
[dfs]: tocshi.github.io/Library/dfscustom.gif "Depth-First Search"
[bfs]: tocshi.github.io/Library/bfscustom.gif "Breadth-First Search"
[330]: tocshi.github.io/Library/330proj_1.png "Machine Learning Dataset Analysis"
[304_1]: tocshi.github.io/Library/304proj_1.png "Game Data Manager 1"
[304_2]: tocshi.github.io/Library/304proj_1.png "Game Data Manager 2"
