import { Uploader } from "@irys/upload";
import { BaseEth } from "@irys/upload-ethereum";
import BaseNodeIrys from "@irys/upload/esm/base";
export async function initialize() {
  const irysUploader = await Uploader(BaseEth).withWallet(
    process.env.ADMIN!,
  )
  .devnet()
  .withRpc(process.env.RPC_URL!);
  irys = new IrysService(irysUploader);
  if (await irys.balance() < 0.01) {
    await irys.fundAccount()
  }
}

export let irys: IrysService

class IrysService {
  private irysUploader: BaseNodeIrys; // Replace 'any' with proper type if available

  constructor(irysUploader: BaseNodeIrys) {
    this.irysUploader = irysUploader;
  }

  async fundAccount() {
    try {
      console.log('funding')
      const fundTx = await this.irysUploader
      .fund(
        this.irysUploader.utils.toAtomic(0.01),
      );
      console.log(
        `Successfully funded ${
          this.irysUploader.utils.fromAtomic(fundTx.quantity)
        } ${this.irysUploader.token}`,
      );
    } catch (e) {
      console.log("Error when funding ", e);
    }
  }

  async uploadData(data: string | Buffer, tags: { name: string; value: string }[]) {
    const response = await this.irysUploader.upload(data, { tags });
    console.log(
      `File uploaded ==> https://gateway.irys.xyz/${response.id}`,
    );
    return { id: response.id, url: `https://gateway.irys.xyz/${response.id}` };
  }

  async queryTransactionById(id: string) {
    const query = this.irysUploader.query();
    return query
      .search("irys:transactions")
      .ids([id])
      .then(console.log);
  }
  
  async balance() {

    const balance = await this.irysUploader.getBalance();
    return balance.toNumber()
  }

  async getFile(id: string) {
    const response = await fetch(`https://gateway.irys.xyz/${id}`)
    .then(res => res.json())
    // console.log(response)
    return response
  }
}