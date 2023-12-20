// import LoginPage from 'pageobjects/login.page'
import { remote } from 'webdriverio'
// import {browser, expect} from '@wdio/globals'
// import SecurePage from 'pageobjects/secure.page'

export const app = async () => {
    const browser = await remote({
        logLevel: 'error',
        path: '/', // remove `path` if you decided using something different from driver binaries.
        capabilities: {
            browserName: 'chrome'
        }
    })

    await browser.url(`https://the-internet.herokuapp.com/`)
    //
    // await LoginPage.open()
    // await LoginPage.login('tomsmith', 'SuperSecretPassword!')
    // await expect(SecurePage.flashAlert).toBeExisting()
    // await expect(SecurePage.flashAlert).toHaveTextContaining(
    //     'You logged into a secure area!')

    await browser.deleteSession()
}
