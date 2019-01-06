# Web-Ponies
Reimplementation of Desktop Ponies in browser javaScript

## Development

At first, you should get git submodule for using images of [Desktop-Ponies](https://github.com/RoosterDragon/Desktop-Ponies)
without bloating this 
repository.

```sh
git submodule init
git submodule update
```

Then moving ponies images into repo and marshalling datas should be prepared by 
executing script file `scripts/convertIni.js`.

```sh
npm i
npm run prepare
```

Now it's ready for development!

```sh
npm run start
```

## Thanks to

This library started from fork of [Browser-Ponies](https://github.com/panzi/Browser-Ponies). 
Thanks to [@panzi](https://github.com/panzi) and [@JasminDreasond](https://github.com/JasminDreasond) 
for their efforts!

