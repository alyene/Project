const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res, next) {
//  res.status(500).send('Not Implemented');

  const sequelize = new Sequelize('null', 'null', 'null', {
    dialect: 'sqlite',
    storage: 'db/database.db',
    define: {
      timestamps: false
    }
  });

  //MODELS
  const genres = sequelize.define('genres', {
    id: { allowNull: false, primaryKey: true, unique: true, type: Sequelize.INTEGER },
    name: { allowNull: false, type: Sequelize.STRING }
  });

  const films = sequelize.define('films', {
    id: { allowNull: false, primaryKey: true, unique: true, type: Sequelize.INTEGER },
    title: { allowNull: false, type: Sequelize.STRING },
    release_date: { allowNull: false, type: Sequelize.DATE },
    tagline: { allowNull: false, type: Sequelize.STRING },
    revenue: { allowNull: false, defaultValue: 0, type: Sequelize.BIGINT },
    budget: { allowNull: false, type: Sequelize.BIGINT },
    runtime: { allowNull: false, type: Sequelize.INTEGER },
    original_language: { allowNull: false, type: Sequelize.STRING },
    status: { allowNull: false, type: Sequelize.STRING },
    genre_id: { allowNull: false, type: Sequelize.INTEGER }
  });

  //RELATIONS
  genres.hasOne(films, {
    foreignKey: 'genre_id'
  });

  films.belongsTo(genres, {
    foreignKey: 'genre_id'
  });

  let id = req.params.id;

  //FETCH ALL
  //app.get('/films', (req, res, next) => {
  films.find({
    where: {
      id: id
    },
    include: [
      {
        model: genres,
        required: false
      }
    ],
    offset: 0,
    limit: 10
    })
      .then(film => {
        res.json({
          film: {
            film_id: film.id,
            title: film.title,
            release_date: film.release_date,
            genre: film.genre.name,
          }
        });
  })
    .catch(next);















}

app.use(function(req, res, next) {
  res.status(404).json({ message: 'Oops, not found' });
  console.log(res.statusCoe);
});


module.exports = app;
