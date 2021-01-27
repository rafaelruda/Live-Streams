# windows
Foreach($Item in ls) {
  echo $item
  cd $item
  npm ci --silent
  cd ..
}

# Linux
rm -rf **/**/node_modules
cp -r aula02 aula03
cd aula03

for item in `ls`;
do
echo $item
cd $item
npm ci --silent
cd ..
done