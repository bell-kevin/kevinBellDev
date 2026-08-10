// The plugins are imported rather than named as strings so that resolution
// never depends on the shape of node_modules. String names are looked up
// relative to the config file, which is what broke under pnpm's isolated
// module layout previously.
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [tailwindcss, autoprefixer],
};
