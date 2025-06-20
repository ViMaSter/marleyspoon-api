import {test} from "node:test";
import {MarleySpoonClient} from "marleyspoon";
import assert from "node:assert/strict";

[19, 20].forEach((count) => {
    test(`client allows fetching ${count} past order ids`, async () => {
        const client = new MarleySpoonClient(process.env.remember_spree_user_token);
        await client.login();
        const orderIds = (await client.getPastOrders(count)).map(order => order.number);
        assert.ok(orderIds.length > 0);
        assert.ok(orderIds.length <= count);
        for (const orderId of orderIds) {
            assert.ok(orderId.length > 0);
        }
    });
});

test(`client allows fetching reverse order`, async () => {
    const client = new MarleySpoonClient(process.env.remember_spree_user_token);
    await client.login();
    const orderIds = (await client.getPastOrders(1000)).map(order => order.number);
    const reverseOrderIds = (await client.getPastOrders(1000, "ASC")).map(order => order.number);
    assert.deepEqual(orderIds.reverse(), reverseOrderIds);
});

test("client allows fetching this weeks nutrition data", async () => {
    const client = new MarleySpoonClient(process.env.remember_spree_user_token);
    await client.login();
    const nutritionData = (await client.getPastOrders(1, "DESC", "COMPLAINABLE", true))[0];

    for (const item of nutritionData.contents.recipes) {
        assert.ok(item.id > 0);
        assert.ok(item.title.length > 0);
        assert.ok(item.subtitle.length > 0);

        assert.ok(item.nutritionalInformation.kcal.per100g > 0);
        assert.ok(item.nutritionalInformation.carbohydrates.per100g > 0);
        assert.ok(item.nutritionalInformation.fat.per100g > 0);
        assert.ok(item.nutritionalInformation.protein.per100g > 0);

        assert.ok(item.nutritionalInformation.kcal.perPortion > 0);
        assert.ok(item.nutritionalInformation.carbohydrates.perPortion > 0);
        assert.ok(item.nutritionalInformation.fat.perPortion > 0);
        assert.ok(item.nutritionalInformation.protein.perPortion > 0);
    }
});

test("client allows fetching past 4 weeks nutrition data", async () => {
    const client = new MarleySpoonClient(process.env.remember_spree_user_token);
    await client.login();
    const nutritionData = (await client.getPastOrders(4, "DESC", "COMPLAINABLE", true));

    assert.ok(nutritionData.length > 0);
    for (const week of nutritionData) {
        for (const item of week.contents.recipes) {
            assert.ok(item.id > 0);
            assert.ok(item.title.length > 0);
            assert.ok(item.subtitle.length > 0);

            assert.ok(item.nutritionalInformation.kcal.per100g > 0);
            assert.ok(item.nutritionalInformation.carbohydrates.per100g > 0);
            assert.ok(item.nutritionalInformation.fat.per100g > 0);
            assert.ok(item.nutritionalInformation.protein.per100g > 0);

            assert.ok(item.nutritionalInformation.kcal.perPortion > 0);
            assert.ok(item.nutritionalInformation.carbohydrates.perPortion > 0);
            assert.ok(item.nutritionalInformation.fat.perPortion > 0);
            assert.ok(item.nutritionalInformation.protein.perPortion > 0);
        }
    }
});

test("login throws if remember_spree_user_token is missing", async () => {
    const client = new MarleySpoonClient();
    await assert.rejects(
        async () => {
            await client.login();
        },
        {
            message: "remember_spree_user_token is required for login"
        }
    );
});

test("login throws if response is not valid JSON", async () => {
    const client = new MarleySpoonClient("invalid token");
    await assert.rejects(
        async () => {
            await client.login();
        },
        (err) => {
            assert.ok(err.message.includes("remember_spree_user_token") && err.message.includes("expired"));
            return true;
        }
    );
});