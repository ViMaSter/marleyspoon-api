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

    
    /**
     * Retrieves a list of past order numbers for the authenticated user, sorted by delivery date.
     *
     * @async
     * @param {number} [count=20] The maximum number of orders to retrieve.
     * @param {string} [sortDirection="DESC"] The direction to sort orders: "ASC" (oldest order first) or "DESC" (most recent order first)
     * @param {string} [scope=""] Optional scope for filtering orders, valid values: "AFTER_BILL_DEADLINE", "BEFORE_BILL_DEADLINE", "RECOMMENDED", "PROMOTED", "PAST", "CURRENT", "UPCOMING", "OUTSTANDING", "FAILED_PREAUTHORIZATIONS"
     * @returns {Promise<string[]>} A promise that resolves to an array of order numbers.
     * @throws {Error} If the user is not authenticated or if the fetch request fails.
     */
    async getPastOrders(count = 20, sortDirection = "DESC", scope = "") {
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
                            orders(first: ${count}, sortBy: DELIVERY_DATE, ${scope ? "scope: " + scope + "," : ""} sortDirection: ${sortDirection}) {
                                number
                                deliveryDate
                            }
                        }
                    }
                `,
                variables: {}
            })
        });

        if (!response.ok) {
            throw new Error("Failed to fetch past orders: " + response.statusText);
        }
        const data = await response.json();
        if (!data.data || !data.data.me || !data.data.me.orders) {
            throw new Error("No past orders found");
        }

        return data.data.me.orders.map(order => order.number);
    }

    async getThisWeeksOrderId() {
        return (await this.getPastOrders(1, "DESC", "COMPLAINABLE"))[0];
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