import { expect, use, should } from 'chai';
import chaiHttp from 'chai-http';
import { promisify } from 'util';
import redisClient from '../utils/redis';

se(chaiHttp);
should();


describe('Testing redisClient', () => {
  describe('redisClient', () => {
    before(async () => {
      redisClient.client.flushall('ASYNC');
    });

    after(async () => {
      redisClient.client.flushall('ASYNC');
    });

    it('Asserting redis is alive', async () => {
      expect(redisClient.isAlive()).to.equal(true);
    });
    ('Asserting the return to be null', async () => {
        expect(await redisClient.get('myKey')).to.equal(null);
      });
  
      it('Testing redisClient.setkey', async () => {
        expect(await redisClient.set('myKey', 12, 1)).to.equal(undefined);
      });
  
      it('Testing expiration', async () => {
        const sleep = promisify(setTimeout);
        await sleep(1100);
        expect(await redisClient.get('myKey')).to.equal(null);
      });
    });
});
