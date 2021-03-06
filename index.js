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
app.get('/films/:id/recommendations', getFilmRecommendations);

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

  let id = req.params.id,
      recommendations = [],
      offset = 0,
      limit = 10;

  // INVALID IDs ERROR HANDLING
  if (isNaN(id) || id === undefined) {
    return res.status(422).json({ message: 'key missing' });
  }
  // INVALID QUERY ERROR HANDLING
  if (isNaN(parseInt(req.query.offset)) && isNaN(parseInt(req.query.limit))) {
    if (
      !req.originalUrl.endsWith('recommendations') &&
      !req.originalUrl.endsWith('recommendations/')
    ) {
      return res.status(422).json({ message: 'key missing' });
    }
  }

  //SUBQUERY
  const findByGenreId = sequelize.dialect.QueryGenerator.selectQuery('films',{
    attributes: ['genre_id'],
    where: {
         id: id
       }
    })
    .slice(0,-1);

  //FIND ALL FILMS WHERE GENRE_ID AND RELEASE_DATES RANGE +/-15 YEARS AS ON SPECIFIC FILM.ID
  films.findAll({
    include: [
      {
        model: genres,
        required: false
      }
    ],
    where: {
      genre_id: {
        $in: sequelize.literal('(' + findByGenreId + ')'),
      },
      release_date: {
        $gte: sequelize.literal(`date((SELECT release_date FROM films WHERE id = ${id}), '-15 years')`),
        $lte: sequelize.literal(`date((SELECT release_date FROM films WHERE id = ${id}), '+15 years')`),
      }
    }
   //GET REVIEWS AND RATINGS FOR THE FILMS, AND FILTER THE ONES WITH REVIEWS NUMBER MORE THAN 5 AND AVERAGE RATING HIGHER THAN 4
    }).then(films => {
      let count = 0;
      films.map(film => {
      console.log(film);
      request(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${film.id}`, function (error, response, body) {
        count++;
        if (!error && response.statusCode == 200) {
          let data = JSON.parse(body);
          let rev = data[0].reviews;
          let result = 0;
          if (rev.length >= 5){
            rev.map((review) => {
              result += review.rating;
            })
              let averageRating = (result/rev.length).toFixed(2);
              if( averageRating > 4){
                if(data[0].film_id === film.id) {
                  film = {
                    id: film.id,
                    title: film.title,
                    releaseDate: film.release_date,
                    genre: film.genre.name,
                    averageRating: averageRating,
                    reviews: rev.length,
                  };
                  recommendations.push(film);
                  console.log(recommendations);
                }
              }
          }
          if (films.length === count) {
            let resObj = Object.assign(
              {},
              {
              recommendations: recommendations.splice(offset, limit),
              meta: { limit, offset }
            })
            res.json(resObj)
          }
        };
      });
    });
  });
};

app.use(function(req, res, next) {
  res.status(404).json({ message: 'Oops, not found' });
  console.log(res.statusCoe);
});


module.exports = app;
