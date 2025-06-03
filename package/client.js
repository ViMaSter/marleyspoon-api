export class MarleySpoonClient {
    constructor(remember_spree_user_token) {
        this.remember_spree_user_token = remember_spree_user_token;
    }

    async login() {
        if (!this.remember_spree_user_token) {
            throw new Error("remember_spree_user_token is required for login");
        }
        const response = await fetch("https://marleyspoon.de/accounts/refresh-token", {
            method: "GET",
            headers: {
                "Cookie": `remember_spree_user_token=${this.remember_spree_user_token}`
            }
        });
        if (!response.ok) {
            throw new Error("Failed to login: " + response.statusText);
        }
        let data;
        try {
            data = await response.json();
        } catch (err) {
            throw new Error("Failed to parse login response; `remember_spree_user_token` might have expired: " + err.message);
        }
        if (!data.token) {
            throw new Error("Login failed: " + data.message);
        }

        this.authorizationToken = data.token;
    }

    async getThisWeeksOrderId() {
        if (!this.authorizationToken) {
            throw new Error("Call login() before calling any other methods");
        }

        const response = await fetch("https://api.marleyspoon.com/graphql", {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.authorizationToken}`,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                query: `
                    query {
                        me {
                            orders(scope: COMPLAINABLE, first: 1, sortBy: DELIVERY_DATE, sortDirection: DESC) {
                                number
                            }
                        }
                    }
                `,
                variables: {}
            })
        });

        if (!response.ok) {
            throw new Error("Failed to fetch this week's order: " + response.statusText);
        }
        const data = await response.json();
        if (!data.data || !data.data.me || !data.data.me.orders || data.data.me.orders.length === 0) {
            throw new Error("No orders found for this week");
        }

        return data.data.me.orders[0].number;
    }

    async getNutritionData(orderId) {
        if (!this.authorizationToken) {
            throw new Error("Call login() before calling any other methods");
        }

        const response = await fetch("https://api.marleyspoon.com/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.authorizationToken}`
            },
            body: JSON.stringify({
                query: `
                    query OrderDetails($number: String!) {
                        order(number: $number) {
                            id
                            number
                            contents {
                                recipes {
                                    id
                                    title
                                    subtitle
                                    nutritionalInformation {
                                        name
                                        key
                                        perPortion
                                        per100g
                                        unit
                                    }
                                }
                            }
                        }
                    }
                `,
                operationName: "OrderDetails",
                variables: {
                    number: orderId
                }
            })
        });

        if (!response.ok) {
            throw new Error("Failed to fetch nutrition data: " + response.statusText);
        }

        const data = await response.json();

        return data.data.order.contents.recipes.map(recipe => {
            // Helper to extract nutrition by key
            const getNutrition = key => {
            const item = recipe.nutritionalInformation.find(n => n.key === key);
            return item
                ? { perPortion: item.perPortion, per100g: item.per100g }
                : { perPortion: null, per100g: null };
            };
            return {
            id: recipe.id,
            title: recipe.title,
            subtitle: recipe.subtitle,
            nutritionalInformation: {
                kcal: getNutrition("energy_kcal"),
                carbohydrates: getNutrition("total_carbs"),
                fat: getNutrition("total_fat"),
                protein: getNutrition("protein")
            }
            };
        });
    }
}