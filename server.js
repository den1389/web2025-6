const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { program } = require('commander');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

program
  .requiredOption('-h, --host <host>', 'host')
  .requiredOption('-p, --port <port>', 'port')
  .requiredOption('-c, --cache <path>', 'cache directory')
  .parse(process.argv);

const { host, port, cache } = program.opts();
const app = express();
const upload = multer();
if (!fs.existsSync(cache)) {
  console.error(`Error: Cache directory '${cache}' does not exist.`);
  process.exit(1); 
}

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Note Storage API',
      version: '1.0.0',
      description: 'API',
    },
  },
  apis: ['./server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(express.json());

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Повертає HTML-форму для завантаження нотаток
 *     responses:
 *       200:
 *         description: HTML-сторінка повернута успішно
 */
app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

/**
 * @swagger
 * /write:
 *   post:
 *     summary: Створити нову нотатку
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *               note:
 *                 type: string
 *             required:
 *               - note_name
 *               - note
 *     responses:
 *       201:
 *         description: Нотатку створено
 *       400:
 *         description: Нотатка вже існує
 */
app.post('/write', upload.none(), (req, res) => {
  const noteName = req.body.note_name;
  const noteText = req.body.note;

  const notePath = path.join(cache, `${noteName}.txt`);
  if (fs.existsSync(notePath)) {
    return res.status(400).send('Note already exists');
  }

  fs.writeFileSync(notePath, noteText);
  res.status(201).send('Note created');
});

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Отримати нотатку за ім'ям
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успішне отримання нотатки
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       404:
 *         description: Нотатку не знайдено
 */
app.get('/notes/:name', (req, res) => {
  const notePath = path.join(cache, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }

  const text = fs.readFileSync(notePath, 'utf8');
  res.send(text);
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Оновити текст нотатки
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *     responses:
 *       200:
 *         description: Нотатку оновлено
 *       404:
 *         description: Нотатку не знайдено
 */
app.put('/notes/:name', express.text(), (req, res) => {
  const notePath = path.join(cache, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }

  fs.writeFileSync(notePath, req.body);
  res.send('Note updated');
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Видалити нотатку
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Нотатку видалено
 *       404:
 *         description: Нотатку не знайдено
 */
app.delete('/notes/:name', (req, res) => {
  const notePath = path.join(cache, `${req.params.name}.txt`);
  if (!fs.existsSync(notePath)) {
    return res.status(404).send('Note not found');
  }

  fs.unlinkSync(notePath);
  res.send('Note deleted');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати всі нотатки
 *     responses:
 *       200:
 *         description: Успішне отримання списку нотаток
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   text:
 *                     type: string
 */
app.get('/notes', (req, res) => {
  const notes = [];
  fs.readdirSync(cache).forEach(file => {
    if (file.endsWith('.txt')) {
      const name = file.replace('.txt', '');
      const text = fs.readFileSync(path.join(cache, file), 'utf8');
      notes.push({ name, text });
    }
  });
  res.status(200).json(notes);
});

app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
