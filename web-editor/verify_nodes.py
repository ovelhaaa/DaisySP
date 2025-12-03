from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:4173")
            page.wait_for_selector("text=DaisySP Visual Editor")

            # Click buttons to add new nodes
            page.click("text=AllP")
            page.click("text=Phas")
            page.click("text=Verb")
            page.click("text=Delay")
            page.click("text=GranD")

            # Wait for nodes to appear (custom nodes have specific texts)
            page.wait_for_selector("text=Allpass")
            page.wait_for_selector("text=Phaser")
            page.wait_for_selector("text=Reverb")
            page.wait_for_selector("text=GranularDelay")

            # Click one to show properties
            page.click("text=GranularDelay")
            page.wait_for_selector("text=Grain Size")

            page.screenshot(path="verification/new_nodes.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
