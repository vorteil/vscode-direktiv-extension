import * as vscode from 'vscode';
const fetch = require("node-fetch")

export class InstancesProvider implements vscode.TreeDataProvider<Instance> {

//   public namespace
//   public url
//   public token

public manager: Map<string, any>

  constructor() {
    //   this.namespace = namespace
    //   this.url = url
    //   this.token = token
    this.manager = new Map()    
  }
  
  private _onDidChangeTreeData: vscode.EventEmitter<Instance | undefined | null | void> = new vscode.EventEmitter<Instance | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Instance | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async handleError(resp: any, summary: string, perm: string) {
        const contentType = resp.headers.get('content-type');
        if(resp.status !== 403) {
            if (!contentType || !contentType.includes('application/json')) {
                let text = await resp.text()
                throw new Error (`${summary}: ${text}`)
            } else {
                let text = (await resp.json()).Message
                throw new Error (`${summary}: ${text}`)
            }
        } else {
            throw new Error(`You are unable to '${summary}', contact system admin or namespace owner to grant '${perm}'.`)
        }
    }

  add(url: string, token: string, namespace: string) {
    this.manager.set(`${url}`, {namespace: namespace, token: token})
    this.refresh()
  }

  getTreeItem(element: Instance): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Instance): Thenable<Instance[]> {
    if(element) {
        console.log(element)
        let url = element.label.substr(0, element.label.lastIndexOf(`/${element.values.namespace}`))
        return Promise.resolve(this.getInstancesForNamespace(url, element.values.token, element.values.namespace))
    } else {
        let arr: Array<Instance> = []
        if (this.manager.size > 0){
            this.manager.forEach((v, k)=>{
                arr.push(new Instance(`${k}/${v.namespace}`, v, vscode.TreeItemCollapsibleState.Collapsed))
            })
        }  
        return Promise.resolve(arr)
    }
  }

  private async getInstancesForNamespace(url: string, token: string, namespace: string): Promise<Instance[]> {
    try {
        // TODO replace pagination with full fetch
        let resp = await fetch(`${url}/api/instances/${namespace}?offset=0&limit=1000`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        if(!resp.ok) {
            await this.handleError(resp, "List Instances", "listInstances")
        } else {
            let json = await resp.json()
            let arr = []
            if(json.workflowInstances) {
                for(let i=0; i < json.workflowInstances.length; i++) {
                    arr.push(new Instance(json.workflowInstances[i].id, json.workflowInstances[i].status, vscode.TreeItemCollapsibleState.None))
                }
            }
            return arr
        }
    } catch(e) {
        vscode.window.showErrorMessage(e.message)
    }
    return []
  }

}

class Instance extends vscode.TreeItem {

  constructor(
    public readonly label: string,
    public readonly values: any,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
        this.tooltip = `${this.label}`;
  }
}