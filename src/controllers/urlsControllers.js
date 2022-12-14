import connection from '../databases/postgres.js';
import { nanoid } from 'nanoid';

// routes process and validations functions
async function incrementVisitCounter(urlData) {
  const incrementCounter = urlData[0].visitCount + 1;

  await connection.query(
    `UPDATE urls
    SET "visitCount" = $1
    WHERE id = $2;`,
    [ incrementCounter, urlData[0].id ]
  );
}

async function isExistingUrl(urlId) {
  const { rows: urlData } = await connection.query(
    `SELECT * FROM urls WHERE id = $1;`,
    [ urlId ]
  );

  return urlData;
}

async function alreadyRegisteredUrl(url) {
  const { rows: urlData } = await connection.query(
    `SELECT * FROM urls WHERE url = $1;`,
    [ url ]
  )

  return urlData[0];
}

// routes functions
export async function decreaseUrl(req, res) {
  const { userId } = res.locals;
  const { url } = req.body;

  try {
    const isUrlRegistered = await alreadyRegisteredUrl(url);

    if(isUrlRegistered) return res.sendStatus(409);

    const shortUrl = nanoid();

    const { rows:userData } = await connection.query(
      `SELECT * FROM users WHERE id = $1;`,
      [ userId ]
    );

    await connection.query(
      `INSERT INTO urls
      ( url, "shortUrl", "userId")
      VALUES ( $1, $2, $3 );`,
      [ url, shortUrl, userId ]
    );

    res.status(201).send({ shortUrl });
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
}

export async function getUrl(req, res) {
  const { id: urlId } = req.params;

  try {

    const { rows: urlData } = await connection.query(
      `SELECT id, "shortUrl", url
      FROM urls
      WHERE id = $1;`,
      [ urlId]
    );

    if(!urlData[0]) return res.sendStatus(404);

    res.status(200).send(urlData[0]);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
}

export async function directShortUrl(req, res) {
  const { shortUrl } = req.params;

  try{
    const { rows: urlData } = await connection.query(
      `SELECT * FROM urls WHERE "shortUrl" = $1;`,
      [ shortUrl ]
    );

    if(!urlData[0]) return res.sendStatus(404);

    await incrementVisitCounter(urlData);

    res.redirect(urlData[0].url);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
}

export async function deleteUrl(req, res) {
  const { id: urlId } = req.params;
  const { userId } = res.locals;

  try {
    const urlData = await isExistingUrl(urlId);

    if(!urlData[0]) return res.sendStatus(404);
    if(urlData[0].userId !== userId) return res.sendStatus(401);

    await connection.query(
      `DELETE FROM urls WHERE id = $1`,
      [ urlId ]
    )

    res.sendStatus(204);
  } catch(err) {
    console.log(err);
    res.sendStatus(500);
  }
}