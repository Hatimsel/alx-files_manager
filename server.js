import express from 'express';
import process from 'process';
import router from './routes/index';

const app = express();

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`Server starting on http://localhost:${port}`);
});
