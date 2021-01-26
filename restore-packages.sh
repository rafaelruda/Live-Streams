Foreach($Item in ls) {
  echo $item
  cd $item
  npm ci ---silent
  cd..
}
