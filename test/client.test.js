import {test} from "node:test";
import {MarleySpoonClient} from "marleyspoon";
import assert from "node:assert/strict";

test("client allows fetching this weeks nutrition data", async () => {
    const client = new MarleySpoonClient(process.env.remember_spree_user_token);
    await client.login();
    const thisWeeksOrderID = (await client.getThisWeeksOrderId());
    const nutritionData = await client.getNutritionData(thisWeeksOrderID);

    assert.ok(nutritionData.length > 0);
    for (const item of nutritionData) {
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